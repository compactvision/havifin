<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\Counter;
use App\Models\Session;
use App\Support\TenantAccess;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $shopIds = TenantAccess::shopIds($user);

        if ($request->filled('shop_id')) {
            $shopId = TenantAccess::resolveShopId($user, $request->integer('shop_id'));
            $shopIds = collect([$shopId]);
        }

        $query = CashRegister::query()->whereIn('shop_id', $shopIds);

        if ($user->isCashier()) {
            abort_if(! $user->counter_id, 403, 'Aucun guichet assigné.');
            $query->where('counter_id', $user->counter_id);
        }

        $workSessionIds = Session::open()
            ->whereIn('shop_id', $shopIds)
            ->pluck('id');

        return $query->with(['shop', 'counter', 'activeSession' => function ($q) use ($workSessionIds, $user) {
            if ($workSessionIds->isNotEmpty()) {
                $q->whereIn('work_session_id', $workSessionIds);
            } else {
                $q->whereDate('opened_at', today());
            }

            if ($user->isCashier()) {
                $q->where('user_id', $user->id);
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

        TenantAccess::authorizeShop($request->user(), (int) $validated['shop_id']);

        if (! empty($validated['counter_id'])) {
            $counterBelongsToShop = Counter::whereKey($validated['counter_id'])
                ->where('shop_id', $validated['shop_id'])
                ->exists();
            abort_unless($counterBelongsToShop, 422, 'Le guichet ne correspond pas à la boutique.');
        }

        $register = CashRegister::create($validated);

        return response()->json($register, 201);
    }

    public function show(CashRegister $cashRegister, Request $request)
    {
        $user = $request->user();
        TenantAccess::authorizeShop($user, $cashRegister->shop_id);

        if ($user->isCashier()) {
            abort_unless(
                (int) $cashRegister->counter_id === (int) $user->counter_id,
                403,
                'Cette caisse appartient à un autre guichet.',
            );
        }

        $workSession = Session::open()->where('shop_id', $cashRegister->shop_id)->first();

        return $cashRegister->load(['shop', 'counter', 'balances', 'activeSession' => function ($q) use ($user, $workSession) {
            if ($workSession) {
                $q->orderByRaw('CASE WHEN work_session_id = ? THEN 0 ELSE 1 END', [$workSession->id]);
            }

            if ($user->isCashier()) {
                $q->where('user_id', $user->id);
            }
        }]);
    }
}
