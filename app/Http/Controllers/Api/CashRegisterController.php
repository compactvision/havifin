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
            $shopIds = $user->shops()->pluck('shops.id');
            $query->whereIn('shop_id', $shopIds);
        } else {
            $shopIds = \App\Models\Shop::pluck('id');
        }

        $workSession = \App\Models\Session::open()->latest('session_date')->whereIn('shop_id', $shopIds)->first();

        return $query->with(['shop', 'counter', 'activeSession' => function($q) use ($user, $workSession) {
            if ($workSession) {
                // Return session from CURRENT work session
                $q->where('work_session_id', $workSession->id);
            } else {
                // Or fallback to current day
                $q->whereDate('opened_at', today());
            }
        }])->get();
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

    public function show(CashRegister $cashRegister, Request $request)
    {
        $user = $request->user();
        $workSession = \App\Models\Session::open()->where('shop_id', $cashRegister->shop_id)->first();

        return $cashRegister->load(['shop', 'counter', 'balances', 'activeSession' => function($q) use ($user, $workSession) {
            if ($workSession) {
                $q->orderByRaw('CASE WHEN work_session_id = ? THEN 0 ELSE 1 END', [$workSession->id]);
            }
        }]);
    }
}
