<?php

namespace App\Http\Controllers;

use App\Models\ExchangeRate;
use Illuminate\Http\Request;

class ExchangeRateController extends Controller
{
    public function index()
    {
        return ExchangeRate::where('is_active', true)->get();
    }

    public function store(Request $request)
    {
        // For admin to set rates
        $validated = $request->validate([
            'currency_pair' => 'required|string|unique:exchange_rates,currency_pair',
            'buy_rate' => 'required|numeric',
            'sell_rate' => 'required|numeric',
        ]);

        $user = $request->user();
        if ($user) {
            $validated['owner_id'] = $user->role === 'super-admin' ? $user->id : $user->owner_id;
        }

        return ExchangeRate::create($validated);
    }
    
    public function update(Request $request, ExchangeRate $exchangeRate)
    {
         $exchangeRate->update($request->all());
         return $exchangeRate;
    }
}
