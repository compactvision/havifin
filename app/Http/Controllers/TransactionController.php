<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index()
    {
        return Transaction::latest()->get();
    }

    public function store(Request $request)
    {
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
            'cashier_email' => 'nullable|email',
            'client_phone' => 'nullable|string',
        ]);

        $transaction = Transaction::create($validated);

        return response()->json($transaction, 201);
    }
}
