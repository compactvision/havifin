<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\Client;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ShopController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return Shop::with([
                'users' => fn ($query) => $query->where('role', 'manager'),
            ])->get();
        }

        // "agents" previously read shop.users, which this query never loads,
        // so every card showed 0. Count the counters that actually have a
        // cashier assigned instead.
        return $user->shops()
            ->withCount([
                'counters as assigned_cashiers_count' => fn ($q) => $q->whereNotNull('cashier_id'),
            ])
            ->get(['shops.id', 'name', 'slug', 'address', 'counter_count', 'is_active']);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'counter_count' => 'integer|min:1',
            'is_active' => 'boolean',
            'user_ids' => 'sometimes|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        abort_if(
            Shop::withoutGlobalScopes()->where('slug', $validated['slug'])->exists(),
            422,
            'Une boutique portant ce nom existe déjà.',
        );

        // Assign owner_id
        $creator = $request->user();
        $validated['owner_id'] = TenantAccess::ownerId($creator);

        if (! empty($validated['user_ids'])) {
            $allowedCount = User::whereIn('id', $validated['user_ids'])
                ->where('owner_id', $creator->id)
                ->where('role', 'manager')
                ->count();
            abort_unless($allowedCount === count($validated['user_ids']), 422, 'Utilisateur hors environnement.');
        }

        $shop = Shop::create($validated);

        if (isset($validated['user_ids'])) {
            $shop->users()->sync($validated['user_ids']);
        }

        CashierActivity::logAction('configuration_change', "Boutique créée: {$shop->name}");

        return response()->json($shop->load([
            'users' => fn ($query) => $query->where('role', 'manager'),
        ]), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Shop $shop)
    {
        TenantAccess::authorizeShop($request->user(), $shop);

        if (! $request->user()->isSuperAdmin()) {
            return $shop->only(['id', 'name', 'slug', 'address', 'counter_count', 'is_active']);
        }

        return $shop->load([
            'users' => fn ($query) => $query->where('role', 'manager'),
        ]);
    }

    /**
     * Return operational statistics for one shop.
     */
    public function statistics(Request $request, Shop $shop)
    {
        TenantAccess::authorizeShop($request->user(), $shop);

        $today = now()->startOfDay();
        $tomorrow = $today->copy()->addDay();
        $periodStart = $today->copy()->subDays(6);

        $todayTickets = Client::query()
            ->where('shop_id', $shop->id)
            ->whereBetween('created_at', [$today, $tomorrow])
            ->get(['status', 'service', 'phone', 'created_at', 'completed_at']);

        $periodTickets = Client::query()
            ->where('shop_id', $shop->id)
            ->whereBetween('created_at', [$periodStart, $tomorrow])
            ->get(['status', 'created_at']);

        $todayTransactions = Transaction::query()
            ->where('shop_id', $shop->id)
            ->whereBetween('created_at', [$today, $tomorrow])
            ->get(['currency_from', 'amount_from', 'commission', 'created_at']);

        $periodTransactions = Transaction::query()
            ->where('shop_id', $shop->id)
            ->whereBetween('created_at', [$periodStart, $tomorrow])
            ->get(['created_at']);

        $completedTickets = $todayTickets->where('status', 'completed');
        $averageServiceMinutes = $completedTickets
            ->filter(fn (Client $client) => $client->completed_at !== null)
            ->avg(fn (Client $client) => round($client->created_at->diffInSeconds($client->completed_at) / 60, 1));

        $ticketsCount = $todayTickets->count();
        $completedCount = $completedTickets->count();

        $daily = collect(range(6, 0))
            ->map(function (int $daysAgo) use ($periodTickets, $periodTransactions, $today) {
                $date = $today->copy()->subDays($daysAgo);
                $dateKey = $date->toDateString();

                return [
                    'date' => $dateKey,
                    'label' => $date->translatedFormat('D'),
                    'tickets' => $periodTickets->filter(
                        fn (Client $client) => $client->created_at->toDateString() === $dateKey
                    )->count(),
                    'transactions' => $periodTransactions->filter(
                        fn (Transaction $transaction) => $transaction->created_at->toDateString() === $dateKey
                    )->count(),
                ];
            })
            ->values();

        $services = $todayTickets
            ->groupBy(fn (Client $client) => $client->service ?: 'Non défini')
            ->map(fn ($tickets, string $service) => [
                'service' => $service,
                'count' => $tickets->count(),
            ])
            ->sortByDesc('count')
            ->values();

        $volumes = $todayTransactions
            ->groupBy(fn (Transaction $transaction) => $transaction->currency_from ?: 'N/A')
            ->map(fn ($transactions, string $currency) => [
                'currency' => $currency,
                'amount' => round((float) $transactions->sum('amount_from'), 2),
                'commission' => round((float) $transactions->sum('commission'), 2),
                'transactions' => $transactions->count(),
            ])
            ->values();

        $managers = $shop->users()
            ->where('role', 'manager')
            ->orderBy('name')
            ->get(['users.id', 'name', 'email', 'is_active']);

        return response()->json([
            'summary' => [
                'tickets_today' => $ticketsCount,
                'completed_today' => $completedCount,
                'waiting_now' => Client::query()
                    ->where('shop_id', $shop->id)
                    ->whereIn('status', ['waiting', 'called', 'processing'])
                    ->count(),
                'transactions_today' => $todayTransactions->count(),
                'customers_today' => $todayTickets->pluck('phone')->filter()->unique()->count(),
                'completion_rate' => $ticketsCount > 0
                    ? round(($completedCount / $ticketsCount) * 100, 1)
                    : 0,
                'average_service_minutes' => $averageServiceMinutes !== null
                    ? round((float) $averageServiceMinutes, 1)
                    : null,
                'managers_count' => $managers->count(),
            ],
            'daily' => $daily,
            'services' => $services,
            'volumes' => $volumes,
            'managers' => $managers,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Shop $shop)
    {
        $user = $request->user();
        TenantAccess::authorizeShop($user, $shop);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:255',
            'counter_count' => 'integer|min:1',
            'is_active' => 'boolean',
            'user_ids' => [
                'sometimes',
                'array',
                Rule::prohibitedIf($user->isManager()),
            ],
            'user_ids.*' => 'exists:users,id',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
            abort_if(
                Shop::withoutGlobalScopes()
                    ->where('slug', $validated['slug'])
                    ->whereKeyNot($shop->id)
                    ->exists(),
                422,
                'Une boutique portant ce nom existe déjà.',
            );
        }

        $shop->update($validated);

        if (isset($validated['user_ids'])) {
            $allowedUsers = User::whereIn('id', $validated['user_ids'])
                ->where('owner_id', TenantAccess::ownerId($user))
                ->when($user->isSuperAdmin(), fn ($query) => $query->where('role', 'manager'))
                ->count();
            abort_unless($allowedUsers === count($validated['user_ids']), 422, 'Utilisateur hors environnement.');

            $nonManagerIds = $shop->users()
                ->where('role', '!=', 'manager')
                ->pluck('users.id')
                ->all();
            $shop->users()->sync(array_values(array_unique([
                ...$nonManagerIds,
                ...$validated['user_ids'],
            ])));
        }

        CashierActivity::logAction('configuration_change', "Boutique mise à jour: {$shop->name}");

        return response()->json($shop->load([
            'users' => fn ($query) => $query->where('role', 'manager'),
        ]));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Shop $shop)
    {
        TenantAccess::authorizeShop($request->user(), $shop);
        $shop->delete();

        return response()->json(null, 204);
    }

    /**
     * Assign users to a shop.
     */
    public function assignUsers(Request $request, Shop $shop)
    {
        $user = $request->user();
        TenantAccess::authorizeShop($user, $shop);

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $actorShopIds = $user->shops()->pluck('shops.id');
        $allowedUsers = User::whereIn('id', $validated['user_ids'])
            ->where('owner_id', TenantAccess::ownerId($user))
            ->whereIn('role', ['cashier', 'client'])
            ->where(function ($query) use ($actorShopIds) {
                $query->whereDoesntHave('shops')
                    ->orWhereHas('shops', fn ($shops) => $shops->whereIn('shops.id', $actorShopIds));
            })
            ->whereDoesntHave('shops', fn ($shops) => $shops->whereNotIn('shops.id', $actorShopIds))
            ->count();
        abort_unless($allowedUsers === count($validated['user_ids']), 422, 'Utilisateur hors environnement.');

        $managerIds = $shop->users()
            ->where('role', 'manager')
            ->pluck('users.id')
            ->all();
        $shop->users()->sync(array_values(array_unique([
            ...$managerIds,
            ...$validated['user_ids'],
        ])));

        return response()->json($shop->load([
            'users' => fn ($query) => $query->whereIn('role', ['cashier', 'client']),
        ]));
    }

    /**
     * Assign managers without altering the operational staff of the shop.
     */
    public function assignManagers(Request $request, Shop $shop)
    {
        $user = $request->user();
        TenantAccess::authorizeShop($user, $shop);

        $validated = $request->validate([
            'manager_ids' => 'present|array',
            'manager_ids.*' => 'integer|exists:users,id',
        ]);

        $managerIds = array_values(array_unique($validated['manager_ids']));
        $allowedManagers = User::query()
            ->whereIn('id', $managerIds)
            ->where('owner_id', $user->id)
            ->where('role', 'manager')
            ->count();

        abort_unless($allowedManagers === count($managerIds), 422, 'Manager hors environnement.');

        $staffIds = $shop->users()
            ->where('role', '!=', 'manager')
            ->pluck('users.id')
            ->all();

        $shop->users()->sync([...$staffIds, ...$managerIds]);

        return response()->json($shop->load([
            'users' => fn ($query) => $query->where('role', 'manager'),
        ]));
    }
}
