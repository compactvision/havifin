<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use App\Support\TenantAccess;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    /**
     * Ranking of cashiers by volume treated, ticket count and cash
     * differences over a date range (defaults to the last 7 days).
     */
    public function cashiers(Request $request)
    {
        $shopIds = TenantAccess::shopIds($request->user());

        if ($request->filled('shop_id')) {
            $shopId = TenantAccess::resolveShopId($request->user(), $request->integer('shop_id'));
            $shopIds = collect([$shopId]);
        }

        [$start, $end] = $this->resolveRange($request);

        $transactions = Transaction::query()
            ->whereIn('shop_id', $shopIds)
            ->whereHas('session', fn ($q) => $q->whereDate('session_date', '>=', $start)->whereDate('session_date', '<=', $end))
            ->get();

        $cashiersByEmail = User::whereIn('email', $transactions->pluck('cashier_email')->filter()->unique())
            ->get(['id', 'name', 'email'])
            ->keyBy('email');

        $byCashier = $transactions->groupBy('cashier_email')->map(function ($group, $cashierEmail) use ($cashiersByEmail) {
            $cashier = $cashiersByEmail->get($cashierEmail);

            $volumeByCurrency = $group->groupBy('currency_from')
                ->map(fn ($rows) => (float) $rows->sum('amount_from'))
                ->filter();

            return [
                'cashier_id' => $cashier->id ?? null,
                'cashier_name' => $cashier->name ?? ($cashierEmail ?: 'Inconnu'),
                'cashier_email' => $cashierEmail,
                'tickets_treated' => $group->count(),
                'volume_by_currency' => $volumeByCurrency,
                'operations' => [
                    'depot' => $group->where('operation_type', 'depot')->count(),
                    'retrait' => $group->where('operation_type', 'retrait')->count(),
                    'change' => $group->where('operation_type', 'change')->count(),
                    'paiement' => $group->where('operation_type', 'paiement')->count(),
                ],
            ];
        })->values();

        $cashierIds = $byCashier->pluck('cashier_id')->filter();
        $differences = $this->cashierDifferences($shopIds, $cashierIds, $start, $end);

        $ranking = $byCashier->map(function ($row) use ($differences) {
            $row['total_difference_by_currency'] = $row['cashier_id']
                ? $differences->get($row['cashier_id'], collect())
                : collect();

            return $row;
        })->sortByDesc('tickets_treated')->values();

        return response()->json([
            'start_date' => $start,
            'end_date' => $end,
            'ranking' => $ranking,
        ]);
    }

    /**
     * Ranking of shops by volume treated, ticket count and open/closed
     * sessions over a date range (defaults to the last 7 days).
     */
    public function shops(Request $request)
    {
        $shopIds = TenantAccess::shopIds($request->user());

        [$start, $end] = $this->resolveRange($request);

        $transactions = Transaction::query()
            ->whereIn('shop_id', $shopIds)
            ->whereHas('session', fn ($q) => $q->whereDate('session_date', '>=', $start)->whereDate('session_date', '<=', $end))
            ->get();

        $shops = Shop::whereIn('id', $shopIds)->get(['id', 'name'])->keyBy('id');

        $byShop = $transactions->groupBy('shop_id')->map(function ($group, $shopId) use ($shops) {
            $volumeByCurrency = $group->groupBy('currency_from')
                ->map(fn ($rows) => (float) $rows->sum('amount_from'))
                ->filter();

            return [
                'shop_id' => $shopId,
                'shop_name' => $shops->get($shopId)->name ?? 'Inconnue',
                'tickets_treated' => $group->count(),
                'volume_by_currency' => $volumeByCurrency,
                'active_cashiers' => $group->pluck('cashier_email')->filter()->unique()->count(),
            ];
        })->values();

        $shopDifferences = $this->shopDifferences($shopIds, $start, $end);

        $ranking = $byShop->map(function ($row) use ($shopDifferences) {
            $row['total_difference_by_currency'] = $shopDifferences->get($row['shop_id'], collect());

            return $row;
        })->sortByDesc('tickets_treated')->values();

        // Include shops with zero transactions in the range, so a manager can
        // spot a shop that had no activity at all.
        $seenIds = $ranking->pluck('shop_id');
        $missing = $shops->reject(fn ($shop) => $seenIds->contains($shop->id))->map(fn ($shop) => [
            'shop_id' => $shop->id,
            'shop_name' => $shop->name,
            'tickets_treated' => 0,
            'volume_by_currency' => (object) [],
            'active_cashiers' => 0,
            'total_difference_by_currency' => (object) [],
        ])->values();

        return response()->json([
            'start_date' => $start,
            'end_date' => $end,
            'ranking' => $ranking->concat($missing)->values(),
        ]);
    }

    private function resolveRange(Request $request): array
    {
        $end = $request->filled('end_date') ? $request->date('end_date')->toDateString() : now()->toDateString();
        $start = $request->filled('start_date')
            ? $request->date('start_date')->toDateString()
            : now()->subDays(6)->toDateString();

        return [$start, $end];
    }

    private function cashierDifferences($shopIds, $cashierIds, string $start, string $end)
    {
        return CashSession::query()
            ->whereIn('user_id', $cashierIds)
            ->whereHas('register', fn ($q) => $q->whereIn('shop_id', $shopIds))
            ->whereDate('opened_at', '>=', $start)
            ->whereDate('opened_at', '<=', $end)
            ->with('amounts')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($sessions) => $sessions->flatMap->amounts
                ->groupBy('currency')
                ->map(fn ($rows) => (float) $rows->sum('difference'))
                ->filter());
    }

    private function shopDifferences($shopIds, string $start, string $end)
    {
        return CashSession::query()
            ->whereHas('register', fn ($q) => $q->whereIn('shop_id', $shopIds))
            ->whereDate('opened_at', '>=', $start)
            ->whereDate('opened_at', '<=', $end)
            ->with(['amounts', 'register:id,shop_id'])
            ->get()
            ->groupBy(fn ($session) => $session->register->shop_id ?? 0)
            ->map(fn ($sessions) => $sessions->flatMap->amounts
                ->groupBy('currency')
                ->map(fn ($rows) => (float) $rows->sum('difference'))
                ->filter());
    }
}
