<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\CashRegister;
use App\Models\Counter;
use App\Models\Shop;
use App\Models\User;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CounterController extends Controller
{
    /**
     * Display a listing of counters for a shop.
     */
    public function index(Request $request, $shopId)
    {
        $shop = Shop::findOrFail($shopId);
        TenantAccess::authorizeShop($request->user(), $shop);

        $counters = Counter::where('shop_id', $shopId)
            ->with(['cashier']) // Fixed: Load 'cashier' singular
            ->orderBy('counter_number')
            ->get();

        return response()->json($counters);
    }

    /**
     * Store a newly created counter.
     */
    public function store(Request $request, $shopId)
    {
        $shop = Shop::findOrFail($shopId);
        TenantAccess::authorizeShop($request->user(), $shop);

        $validated = $request->validate([
            'counter_number' => 'required|integer|min:1',
            'name' => 'required|string|max:255',
            'cashier_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $this->authorizeCashier($shop, $validated['cashier_id'] ?? null);

        // Check if counter_number already exists for this shop
        $exists = Counter::where('shop_id', $shopId)
            ->where('counter_number', $validated['counter_number'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Ce numéro de guichet existe déjà pour cette boutique.',
            ], 422);
        }

        $counter = DB::transaction(function () use ($shopId, $validated) {
            $counter = Counter::create([
                'shop_id' => $shopId,
                ...$validated,
            ]);
            CashRegister::firstOrCreate(
                ['counter_id' => $counter->id],
                [
                    'shop_id' => $shopId,
                    'name' => "Caisse {$counter->name}",
                ],
            );
            $this->syncCashierAssignment($counter, null, $counter->cashier_id);

            return $counter;
        });

        CashierActivity::logAction('configuration_change', "Guichet créé: {$counter->name} (Boutique: {$shop->name})");

        return response()->json($counter->load('cashier'), 201);
    }

    /**
     * Update the specified counter.
     */
    public function update(Request $request, $id)
    {
        $counter = Counter::findOrFail($id);
        TenantAccess::authorizeShop($request->user(), $counter->shop_id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'cashier_id' => 'nullable|exists:users,id',
            'is_active' => 'sometimes|boolean',
        ]);

        $this->authorizeCashier($counter->shop, $validated['cashier_id'] ?? null);
        $previousCashierId = $counter->cashier_id;

        DB::transaction(function () use ($request, $validated, $counter, $previousCashierId) {
            if ($request->has('cashier_id')) {
                $counter->cashier_id = $validated['cashier_id'] ?? null;
            }

            if ($request->has('name')) {
                $counter->name = $validated['name'];
                $counter->register?->update([
                    'name' => "Caisse {$validated['name']}",
                ]);
            }

            if ($request->has('is_active')) {
                $counter->is_active = $validated['is_active'];
            }

            $counter->save();

            if ($request->has('cashier_id')) {
                $this->syncCashierAssignment($counter, $previousCashierId, $counter->cashier_id);
            }
        });

        CashierActivity::logAction('configuration_change', "Guichet mis à jour: {$counter->name}");

        return response()->json($counter->load('cashier'));
    }

    /**
     * Remove the specified counter.
     */
    public function destroy(Request $request, $id)
    {
        $counter = Counter::findOrFail($id);
        TenantAccess::authorizeShop($request->user(), $counter->shop_id);
        $name = $counter->name;
        DB::transaction(function () use ($counter) {
            $this->syncCashierAssignment($counter, $counter->cashier_id, null);
            $counter->delete();
        });

        CashierActivity::logAction('configuration_change', "Guichet supprimé: {$name}");

        return response()->json(['message' => 'Guichet supprimé avec succès']);
    }

    private function authorizeCashier(Shop $shop, ?int $cashierId): void
    {
        if (! $cashierId) {
            return;
        }

        $cashier = $shop->users()
            ->whereKey($cashierId)
            ->where('role', 'cashier')
            ->first();

        abort_unless(
            $cashier,
            422,
            'Le caissier doit appartenir à cette boutique.',
        );

        if ($cashier->counter_id) {
            abort_if(
                (int) $cashier->counter?->shop_id !== $shop->id,
                422,
                'Ce caissier est déjà affecté à un guichet d’une autre boutique.',
            );
        }
    }

    private function syncCashierAssignment(Counter $counter, ?int $previousCashierId, ?int $cashierId): void
    {
        if ($previousCashierId && $previousCashierId !== $cashierId) {
            User::whereKey($previousCashierId)
                ->where('counter_id', $counter->id)
                ->update(['counter_id' => null]);
        }

        if ($cashierId) {
            Counter::where('cashier_id', $cashierId)
                ->where('shop_id', $counter->shop_id)
                ->whereKeyNot($counter->id)
                ->update(['cashier_id' => null]);
            User::whereKey($cashierId)->update(['counter_id' => $counter->id]);
        }
    }
}
