<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use App\Models\Shop;

class CashRegisterController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = CashRegister::query();

        if ($user->isManager() || $user->isCashier()) {
            // Filter by user's shop(s)
            $shopIds = $user->shops()->pluck('shops.id');
            $query->whereIn('shop_id', $shopIds);
        }

        return $query->with(['shop', 'counter', 'activeSession'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shop_id' => 'required|exists:shops,id',
            'counter_id' => 'nullable|exists:counters,id',
            'name' => 'required|string|max:255',
        ]);

        $register = CashRegister::create($validated);

        return response()->json($register, 201);
    }

    public function show(CashRegister $cashRegister)
    {
        return $cashRegister->load(['shop', 'counter', 'balances', 'activeSession']);
    }
}
