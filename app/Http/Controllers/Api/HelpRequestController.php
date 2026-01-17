<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HelpRequest;
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

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'pending') {
                $query->pending();
            } elseif ($request->status === 'resolved') {
                $query->resolved();
            }
        }

        // Filter by cashier
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
            'cashier_id' => 'nullable|exists:users,id',
            'client_phone' => 'required|string',
            'description' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $helpRequest = HelpRequest::create([
            'cashier_id' => $request->cashier_id ?? Auth::id(),
            'client_phone' => $request->client_phone,
            'description' => $request->description,
            'status' => 'pending',
        ]);

        return response()->json($helpRequest, 201);
    }

    /**
     * Mark a help request as resolved.
     */
    public function resolve($id)
    {
        $helpRequest = HelpRequest::findOrFail($id);

        if ($helpRequest->status === 'resolved') {
            return response()->json([
                'error' => 'Cette demande est déjà résolue',
            ], 400);
        }

        $helpRequest->resolve();

        return response()->json($helpRequest);
    }
}
