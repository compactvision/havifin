<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ExchangeRate;
use App\Models\Session;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $allowedShopIds = TenantAccess::shopIds($request->user());
        $query = Client::query()->whereIn('shop_id', $allowedShopIds);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('cashier_id')) {
            $query->where('cashier_id', $request->integer('cashier_id'));
        }

        if ($request->filled('counter_number')) {
            $query->where('counter_number', $request->integer('counter_number'));
        }

        if ($request->has('shop_id')) {
            TenantAccess::authorizeShop($request->user(), (int) $request->shop_id);
            $query->where('shop_id', $request->shop_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Default to current active session if not filtering by date/session specifically
        if (! $request->has('session_id') && ! $request->has('date')) {
            $user = $request->user();
            if ($user) {
                $shopIds = $user->shops()->pluck('shops.id');
                if ($shopIds->isNotEmpty()) {
                    $activeSessionIds = Session::open()
                        ->latest('session_date')
                        ->whereIn('shop_id', $shopIds)
                        ->pluck('id');

                    if ($activeSessionIds->isNotEmpty()) {
                        $query->whereIn('session_id', $activeSessionIds);
                    } else {
                        $query->whereRaw('1 = 0');
                    }
                }
            }
        }

        if ($request->has('session_id')) {
            $query->where('session_id', $request->session_id);
        }

        if ($request->has('date')) {
            $date = $request->date;
            $query->whereHas('session', function ($q) use ($date) {
                $q->whereDate('session_date', $date);
            });
        }

        // Handle sorting
        if ($request->has('sort')) {
            $sort = $request->sort;
            $direction = 'asc';
            if (str_starts_with($sort, '-')) {
                $sort = substr($sort, 1);
                $direction = 'desc';
            }
            // Map frontend naming to DB naming if necessary
            if ($sort === 'created_date') {
                $sort = 'created_at';
            }
            abort_unless(
                in_array($sort, ['created_at', 'called_at', 'completed_at', 'ticket_number', 'status'], true),
                422,
                'Tri non autorisé.',
            );
            $query->orderBy($sort, $direction);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Handle limit
        if ($request->has('limit')) {
            $query->limit(min(max((int) $request->limit, 1), 100));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'operation_type' => ['required', Rule::in(['depot', 'retrait', 'change', 'paiement'])],
            'service' => 'required|string|max:100',
            'amount' => 'nullable|numeric|min:0.01',
            'amount_from' => 'nullable|numeric',
            'exchange_rate' => 'nullable|numeric',
            'currency_from' => 'nullable|string|size:3',
            'currency_to' => 'nullable|string|size:3',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
            'is_registered' => 'nullable|boolean',
            'notes' => 'nullable|string|max:2000',
            'shop_id' => 'sometimes|integer|exists:shops,id',
        ]);

        $user = $request->user();
        $shopId = TenantAccess::resolveShopId($user, $validated['shop_id'] ?? null);
        $activeSession = Session::open()->where('shop_id', $shopId)->first();

        if (! $activeSession) {
            return response()->json([
                'error' => 'Agence fermée',
                'message' => 'Veuillez patienter qu\'une session soit ouverte par le manager.',
            ], 403);
        }

        $validated['owner_id'] = TenantAccess::ownerId($user);
        $validated['shop_id'] = $shopId;
        $validated['session_id'] = $activeSession->id;
        $validated['status'] = 'waiting';
        $validated['currency_from'] = isset($validated['currency_from'])
            ? strtoupper($validated['currency_from'])
            : null;
        $validated['currency_to'] = isset($validated['currency_to'])
            ? strtoupper($validated['currency_to'])
            : null;

        if (in_array($validated['operation_type'], ['depot', 'retrait', 'paiement'], true)) {
            $operationAmount = (float) ($validated['amount'] ?? 0) >= 0.01
                ? $validated['amount']
                : ($validated['amount_from'] ?? null);
            abort_unless(
                is_numeric($operationAmount) && (float) $operationAmount >= 0.01,
                422,
                'Le montant de l’opération doit être supérieur ou égal à 0,01.',
            );
            $validated['amount'] = $operationAmount;
            $validated['amount_from'] = $operationAmount;
            $validated['currency_to'] = $validated['currency_from'];
            unset($validated['exchange_rate']);
        }

        if ($validated['operation_type'] === 'change') {
            $currencyFrom = $validated['currency_from'] ?? '';
            $currencyTo = $validated['currency_to'] ?? '';

            abort_unless(
                (float) ($validated['amount_from'] ?? 0) >= 0.01
                    && preg_match('/^[A-Z]{3}$/', $currencyFrom)
                    && preg_match('/^[A-Z]{3}$/', $currencyTo)
                    && $currencyFrom !== $currencyTo,
                422,
                'Le montant et les devises de change doivent être valides.',
            );

            $exchangeRate = ExchangeRate::query()
                ->where('currency_pair', "{$currencyFrom}_{$currencyTo}")
                ->where('is_active', true)
                ->first();

            abort_unless(
                $exchangeRate,
                422,
                "Aucun taux n’est configuré pour {$currencyFrom} → {$currencyTo}.",
            );

            $validated['exchange_rate'] = $exchangeRate->rate;
            $validated['amount'] = round(
                (float) $validated['amount_from'] * $exchangeRate->rate,
                2,
            );
        }

        // Each ticket is its own Client row, so a returning customer's email
        // (collected once at registration) doesn't carry over automatically.
        // Backfill it from their most recent ticket that has one, so the
        // end-of-operation notification can actually reach them.
        if (empty($validated['email']) && ! empty($validated['phone'])) {
            $knownEmail = Client::where('phone', $validated['phone'])
                ->where('owner_id', $validated['owner_id'])
                ->whereNotNull('email')
                ->latest('id')
                ->value('email');

            if ($knownEmail) {
                $validated['email'] = $knownEmail;
            }
        }

        $client = DB::transaction(function () use ($validated, $activeSession) {
            Session::whereKey($activeSession->id)->lockForUpdate()->firstOrFail();
            $nextNumber = Client::where('session_id', $activeSession->id)->count() + 1;
            $validated['ticket_number'] = str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

            return Client::create($validated);
        }, 3);

        // Add waiting_ahead to the response
        $waitingAhead = Client::where('session_id', $client->session_id)
            ->whereIn('status', ['waiting', 'calling'])
            ->where('id', '<', $client->id)
            ->count();

        $client->waiting_ahead = $waitingAhead;

        return response()->json($client, 201);
    }

    public function show(Request $request, Client $client)
    {
        TenantAccess::authorizeShop($request->user(), $client->shop_id);

        return $client;
    }

    public function update(Request $request, Client $client)
    {
        $actor = $request->user();
        TenantAccess::authorizeShop($actor, $client->shop_id);

        if ($actor->isCashier() && $client->cashier_id && (int) $client->cashier_id !== $actor->id) {
            abort(403, 'Ce ticket est déjà pris en charge par un autre caissier.');
        }

        $rules = [
            'status' => 'sometimes|in:waiting,called,calling,completed,cancelled',
            'called_at' => 'sometimes|nullable|date',
            'completed_at' => 'sometimes|nullable|date',
            'cashier_id' => 'sometimes|nullable|exists:users,id',
            'counter_number' => 'sometimes|nullable|integer|min:1',
            'notes' => 'sometimes|nullable|string|max:2000',
        ];

        if ($actor->isManager()) {
            $rules += [
                'phone' => 'sometimes|string|max:30',
                'first_name' => 'sometimes|nullable|string|max:255',
                'last_name' => 'sometimes|nullable|string|max:255',
                'email' => 'sometimes|nullable|email|max:255',
                'address' => 'sometimes|nullable|string|max:500',
                'is_registered' => 'sometimes|boolean',
                'operation_type' => 'sometimes|string|max:50',
                'service' => 'sometimes|string|max:100',
            ];
        }

        $validated = $request->validate($rules);
        $hasTransaction = $client->transactions()->exists();

        if ($client->status === 'completed' && ($validated['status'] ?? 'completed') !== 'completed') {
            abort(409, 'Un ticket terminé ne peut pas être rouvert.');
        }

        if (
            $hasTransaction
            && (array_key_exists('operation_type', $validated) || array_key_exists('service', $validated))
        ) {
            abort(409, 'Les données financières d’un ticket traité sont immuables.');
        }

        if (($validated['status'] ?? null) === 'completed') {
            abort_unless(
                $hasTransaction,
                409,
                'Une transaction valide est requise avant de terminer ce ticket.',
            );
        }

        if (! empty($validated['cashier_id'])) {
            if ($actor->isCashier()) {
                abort_unless((int) $validated['cashier_id'] === $actor->id, 422, 'Caissier non autorisé.');
            }

            abort_unless(
                $client->shop->users()
                    ->whereKey($validated['cashier_id'])
                    ->where('role', 'cashier')
                    ->exists(),
                422,
                'Caissier non autorisé.',
            );
        }

        if ($actor->isCashier() && isset($validated['status'])) {
            if (in_array($validated['status'], ['called', 'calling', 'completed'], true)) {
                $validated['cashier_id'] = $actor->id;
                $validated['counter_number'] = $actor->counter?->counter_number;
            }

        }

        $client->update($validated);

        return $client;
    }
}
