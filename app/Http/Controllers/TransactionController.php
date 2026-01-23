<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
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
            $validated['owner_id'] = $user->owner_id ?: $user->id; // If super-admin, owner_id is their id
            $validated['shop_id'] = $user->shops()->first()?->id;
        }

        $transaction = Transaction::create($validated);

        return response()->json($transaction, 201);
    }
}
