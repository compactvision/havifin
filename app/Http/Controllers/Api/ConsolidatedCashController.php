<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ConsolidatedCashController extends Controller
{
    /**
     * Every currently open till, across every shop the caller can see, in
     * one consolidated view - the "rapprochement" a manager overseeing
     * several shops would otherwise have to build by opening each session
     * one at a time and adding the numbers up themselves.
     */
    public function overview(Request $request)
    {
        $shopIds = TenantAccess::shopIds($request->user());

        $sessions = CashSession::query()
            ->where('status', 'open')
            ->whereHas('register', fn ($q) => $q->whereIn('shop_id', $shopIds))
            ->with([
                'register.shop:id,name',
                'register.counter:id,name',
                'user:id,name',
                'amounts',
                'institutionBalances.institution:id,name,type',
            ])
            ->get();

        $rows = $sessions->map(fn (CashSession $session) => [
            'session_id' => $session->id,
            'shop' => $session->register->shop->name ?? null,
            'counter' => $session->register->counter->name ?? null,
            'cashier' => $session->user->name ?? null,
            'opened_at' => $session->opened_at,
            'cash' => $session->amounts->map(fn ($amount) => [
                'currency' => $amount->currency,
                'opening' => (float) $amount->opening_amount,
            ]),
            'institutions' => $session->institutionBalances->map(fn ($balance) => [
                'institution' => $balance->institution->name ?? null,
                'type' => $balance->institution->type ?? null,
                'currency' => $balance->currency,
                'theoretical' => (float) $balance->current_theoretical,
            ]),
        ]);

        // Grand totals, by currency, for the physical cash side.
        $cashTotals = [];
        foreach ($rows as $row) {
            foreach ($row['cash'] as $line) {
                // "opening" here is only the declared fund - the live
                // theoretical isn't tracked per currency the same way
                // institution floats are (see CashBalance instead), so the
                // consolidated cash total intentionally uses each
                // register's live CashBalance for accuracy.
                $cashTotals[$line['currency']] ??= 0;
            }
        }

        // Pull the authoritative live balance per register/currency instead
        // of re-deriving it from movements here.
        $registerIds = $sessions->pluck('register.id')->filter()->unique()->values();
        $balances = \App\Models\CashBalance::whereIn('cash_register_id', $registerIds)->get();
        $cashTotals = $balances->groupBy('currency')->map(fn ($group) => (float) $group->sum('amount'));

        $institutionTotals = $sessions->flatMap->institutionBalances
            ->groupBy(fn ($balance) => ($balance->institution->name ?? 'Inconnu').'|'.$balance->currency)
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'institution' => $first->institution->name ?? 'Inconnu',
                    'currency' => $first->currency,
                    'theoretical' => (float) $group->sum('current_theoretical'),
                ];
            })
            ->values();

        return response()->json([
            'sessions' => $rows,
            'cash_totals' => $cashTotals,
            'institution_totals' => $institutionTotals,
            'open_sessions_count' => $sessions->count(),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * A simple moving-average cash forecast: how much cash/float this shop
     * has actually consumed (net) on an average day recently, used as a
     * recommended opening fund for tomorrow. Deliberately transparent
     * (plain averages, no black-box model) so a manager can sanity-check
     * it against what they know about the shop.
     */
    public function forecast(Request $request)
    {
        $shopIds = TenantAccess::shopIds($request->user());
        $shopId = $request->filled('shop_id')
            ? TenantAccess::resolveShopId($request->user(), $request->integer('shop_id'))
            : null;

        $windows = ['7' => 7, '14' => 14, '30' => 30];
        $since = now()->subDays(30)->startOfDay();

        $movements = CashMovement::query()
            ->whereIn('type', ['deposit', 'withdrawal', 'exchange_in', 'exchange_out'])
            ->whereHas('session.register', function ($q) use ($shopIds, $shopId) {
                $q->whereIn('shop_id', $shopId ? [$shopId] : $shopIds->all());
            })
            ->where('created_at', '>=', $since)
            ->get(['currency', 'amount', 'created_at']);

        $byCurrency = $movements->groupBy('currency');

        $forecast = $byCurrency->map(function ($group, $currency) use ($windows) {
            $windowStats = [];
            foreach ($windows as $label => $days) {
                $cutoff = now()->subDays($days)->startOfDay();
                $windowGroup = $group->filter(fn ($m) => Carbon::parse($m->created_at)->gte($cutoff));

                $inflow = $windowGroup->filter(fn ($m) => (float) $m->amount > 0)->sum(fn ($m) => (float) $m->amount);
                $outflow = abs($windowGroup->filter(fn ($m) => (float) $m->amount < 0)->sum(fn ($m) => (float) $m->amount));
                $daysWithData = max(1, $windowGroup->pluck('created_at')->map(fn ($d) => Carbon::parse($d)->toDateString())->unique()->count());

                $windowStats[$label.'d'] = [
                    'avg_inflow' => round($inflow / $days, 2),
                    'avg_outflow' => round($outflow / $days, 2),
                    'avg_net' => round(($inflow - $outflow) / $days, 2),
                    'active_days' => $daysWithData,
                ];
            }

            // Recommended float: cover an average day's outflow using the
            // most reliable window available (falls back to shorter
            // windows if there isn't 30 days of history yet).
            $recommended = $windowStats['30d']['avg_outflow'] > 0
                ? $windowStats['30d']['avg_outflow']
                : ($windowStats['14d']['avg_outflow'] > 0 ? $windowStats['14d']['avg_outflow'] : $windowStats['7d']['avg_outflow']);

            return [
                'currency' => $currency,
                'windows' => $windowStats,
                'recommended_opening_fund' => round($recommended, 2),
            ];
        })->values();

        return response()->json([
            'shop_id' => $shopId,
            'forecast' => $forecast,
            'based_on_days' => 30,
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
