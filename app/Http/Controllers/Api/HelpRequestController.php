<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\HelpRequest;
use App\Models\Session;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class HelpRequestController extends Controller
{
    /**
     * Get all help requests with filters.
     */
    public function index(Request $request)
    {
        $query = HelpRequest::with('cashier');
        $query->whereIn('shop_id', TenantAccess::shopIds($request->user()));

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'pending') {
                $query->pending();
            } elseif ($request->status === 'resolved') {
                $query->resolved();
            }
        }

        if (! $request->has('cashier_id') && ! $request->has('status')) {
            $user = $request->user();
            $shopIds = $user->shops()->pluck('shops.id');
            $activeSession = Session::open()->latest('session_date')->whereIn('shop_id', $shopIds)->first();
            if ($activeSession) {
                // Since HelpRequest doesn't have session_id yet (implied by date/cashier)
                // we filter by date of the session or today
                $query->whereDate('created_at', $activeSession->session_date);
            } else {
                $query->whereDate('created_at', today());
            }
        }

        if ($request->has('cashier_id')) {
            $query->where('cashier_id', $request->cashier_id);
        }

        $helpRequests = $query->orderBy('created_at', 'desc')->get();

        return response()->json($helpRequests);
    }

    /**
     * Store a new help request.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_phone' => 'required|string|max:30',
            'description' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $shopId = $request->user()->shops()->first()?->id;
        abort_if(! $shopId, 403, 'Aucune boutique assignée.');
        $sessionId = Session::open()->where('shop_id', $shopId)->value('id');

        $helpRequest = HelpRequest::create([
            'owner_id' => TenantAccess::ownerId($request->user()),
            'shop_id' => $shopId,
            'session_id' => $sessionId,
            'cashier_id' => Auth::id(),
            'client_phone' => $request->client_phone,
            'description' => $request->description,
            'status' => 'pending',
        ]);

        CashierActivity::create([
            'cashier_id' => Auth::id(),
            'activity_type' => 'help_request',
            'description' => "Demande d'aide pour le client {$helpRequest->client_phone}: {$helpRequest->description}",
            'created_at' => now(),
        ]);

        return response()->json($helpRequest, 201);
    }

    /**
     * Mark a help request as resolved.
     */
    public function resolve(Request $request, $id)
    {
        $helpRequest = HelpRequest::findOrFail($id);
        TenantAccess::authorizeShop($request->user(), $helpRequest->shop_id);

        if ($helpRequest->status === 'resolved') {
            return response()->json([
                'error' => 'Cette demande est déjà résolue',
            ], 400);
        }

        $helpRequest->resolve();

        CashierActivity::logAction('configuration_change', "Demande d'aide résolue pour {$helpRequest->client_phone}");

        return response()->json($helpRequest);
    }
}
