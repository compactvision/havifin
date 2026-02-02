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
        // Global scope in Transaction model handles the filtering by owner/shop
        return Transaction::latest()->get();
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
            $validated['owner_id'] = $user->owner_id ?: $user->id;
            
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
