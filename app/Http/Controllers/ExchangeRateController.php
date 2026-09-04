<?php

namespace App\Http\Controllers;

use App\Models\CashierActivity;
use App\Models\ExchangeRate;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExchangeRateController extends Controller
{
    public function index()
    {
        return ExchangeRate::where('is_active', true)->get();
    }

    /**
     * Every rate change (manual edit or BCC sync), newest first, so a
     * manager can tell exactly when a rate moved - CashierActivity already
     * logs each one via logAction() in store/update/destroy and in
     * BccRateController::apply().
     */
    public function history(Request $request)
    {
        $shopIds = TenantAccess::shopIds($request->user());
        $perPage = min((int) $request->integer('per_page', 15), 50);

        $activities = CashierActivity::with('cashier:id,name')
            ->where('activity_type', 'configuration_change')
            ->where('description', 'like', 'Taux%')
            ->whereHas('cashier.shops', fn ($q) => $q->whereIn('shops.id', $shopIds))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($activities);
    }

    public function store(Request $request)
    {
        $ownerId = TenantAccess::ownerId($request->user());
        $validated = $request->validate([
            'currency_pair' => [
                'required',
                'string',
                'regex:/^[A-Za-z]{3}_[A-Za-z]{3}$/',
                Rule::unique('exchange_rates', 'currency_pair')
                    ->where('owner_id', $ownerId),
            ],
            'rate' => 'required|numeric|min:0.00000001',
        ]);

        $validated['currency_pair'] = strtoupper($validated['currency_pair']);
        $validated['owner_id'] = $ownerId;
        $validated['is_active'] = true;
        $validated['buy_rate'] = $validated['rate'];
        $validated['sell_rate'] = $validated['rate'];
        unset($validated['rate']);

        $exchangeRate = ExchangeRate::create($validated);
        CashierActivity::logAction(
            'configuration_change',
            "Taux créé: {$exchangeRate->currency_pair}",
        );

        return response()->json($exchangeRate, 201);
    }

    public function update(Request $request, ExchangeRate $exchangeRate)
    {
        TenantAccess::authorizeOwner($request->user(), $exchangeRate);
        $validated = $request->validate([
            'rate' => 'sometimes|required|numeric|min:0.00000001',
            'is_active' => 'sometimes|boolean',
        ]);

        if (array_key_exists('rate', $validated)) {
            $validated['buy_rate'] = $validated['rate'];
            $validated['sell_rate'] = $validated['rate'];
            unset($validated['rate']);
        }

        $exchangeRate->update($validated);
        CashierActivity::logAction(
            'configuration_change',
            "Taux mis à jour: {$exchangeRate->currency_pair}",
        );

        return $exchangeRate;
    }

    public function destroy(Request $request, ExchangeRate $exchangeRate)
    {
        TenantAccess::authorizeOwner($request->user(), $exchangeRate);
        $currencyPair = $exchangeRate->currency_pair;
        $exchangeRate->delete();
        CashierActivity::logAction(
            'configuration_change',
            "Taux supprimé: {$currencyPair}",
        );

        return response()->noContent();
    }
}
