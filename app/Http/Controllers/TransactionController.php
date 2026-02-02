<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    protected $cashService;

    public function __construct(\App\Services\CashService $cashService)
    {
        $this->cashService = $cashService;
    }

    public function index(Request $request)
    {
        $query = Transaction::query();
        $user = $request->user();

        if ($user) {
            $shopIds = $user->shops()->pluck('shops.id');
            if ($shopIds->isNotEmpty() && !$request->has('session_id') && !$request->has('date')) {
                $activeSessionIds = \App\Models\Session::open()
                    ->latest('session_date')
                    ->whereIn('shop_id', $shopIds)
                    ->pluck('id');
                
                if ($activeSessionIds->isNotEmpty()) {
                    $query->whereIn('session_id', $activeSessionIds);
                }
            }
        }

        if ($request->has('session_id')) {
            $query->where('session_id', $request->session_id);
        }

        if ($request->has('date')) {
            $date = $request->date;
            $query->whereHas('session', function ($q) use ($date) {
                $q->whereDate('session_date', $date);
            });
        }

        // Handle sorting
        if ($request->has('sort')) {
            $sort = $request->sort;
            $direction = 'asc';
            if (str_starts_with($sort, '-')) {
                $sort = substr($sort, 1);
                $direction = 'desc';
            }
            if ($sort === 'created_date') {
                $sort = 'created_at';
            }
            $query->orderBy($sort, $direction);
        } else {
            $query->latest();
        }

        // Handle limit
        if ($request->has('limit')) {
            $query->limit($request->limit);
        }

        // Global scope in Transaction model handles the filtering by owner/shop
        return $query->with('client')->get();
    }

    public function store(Request $request)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'client_id' => 'required',
            'ticket_number' => 'required',
            'operation_type' => 'required',
            'service' => 'required',
            'currency_from' => 'required',
            'currency_to' => 'required',
            'amount_from' => 'required|numeric',
            'amount_to' => 'required|numeric',
            'exchange_rate' => 'required|numeric',
            'commission' => 'numeric',
            'client_phone' => 'nullable|string',
        ]);

        if ($user) {
            $validated['cashier_email'] = $user->email;
            
            $shopId = $user->shops()->first()?->id;
            if ($shopId) {
                $validated['shop_id'] = $shopId;
                
                // Enforce active session
                $activeSession = \App\Models\Session::open()->where('shop_id', $shopId)->first();
                if (!$activeSession) {
                    return response()->json([
                        'error' => 'Session requise',
                        'message' => 'Aucune session active pour cette boutique.'
                    ], 403);
                }
                $validated['session_id'] = $activeSession->id;
            }
        }

        $transaction = Transaction::create($validated);

        // Sync with cash register
        $this->cashService->syncTransaction($transaction);

        return response()->json($transaction, 201);
    }
}
