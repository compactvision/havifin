<?php

namespace App\Http\Controllers;

use App\Models\CashSession;
use App\Models\Client;
use App\Models\ExchangeRate;
use App\Models\Session;
use App\Models\Transaction;
use App\Services\CashService;
use App\Services\OperationNotificationService;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class TransactionController extends Controller
{
    protected $cashService;

    public function __construct(
        CashService $cashService,
        protected OperationNotificationService $notifications,
    ) {
        $this->cashService = $cashService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $allowedShopIds = TenantAccess::shopIds($user);
        $query = Transaction::query()->whereIn('shop_id', $allowedShopIds);

        if ($allowedShopIds->isNotEmpty() && ! $request->has('session_id') && ! $request->has('date')) {
            $activeSessionIds = Session::open()
                ->latest('session_date')
                ->whereIn('shop_id', $allowedShopIds)
                ->pluck('id');

            if ($activeSessionIds->isNotEmpty()) {
                $query->whereIn('session_id', $activeSessionIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->filled('shop_id')) {
            $shopId = TenantAccess::resolveShopId($user, $request->integer('shop_id'));
            $query->where('shop_id', $shopId);
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

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('client_phone')) {
            $query->where('client_phone', $request->client_phone);
        }

        // Handle sorting
        if ($request->has('sort')) {
            $sort = $request->sort;
            $direction = 'asc';
            if (str_starts_with($sort, '-')) {
                $sort = substr($sort, 1);
                $direction = 'desc';
            }
            if ($sort === 'created_date') {
                $sort = 'created_at';
            }
            abort_unless(
                in_array($sort, ['created_at', 'amount_from', 'amount_to', 'ticket_number'], true),
                422,
                'Tri non autorisé.',
            );
            $query->orderBy($sort, $direction);
        } else {
            $query->latest();
        }

        // Handle limit
        if ($request->has('limit')) {
            $query->limit(min(max((int) $request->limit, 1), 100));
        }

        // Global scope in Transaction model handles the filtering by owner/shop
        return $query->with('client')->get();
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'client_id' => 'required|integer',
            'amount_from' => 'nullable|numeric|max:999999999999',
            'settlement' => 'nullable|array',
            'settlement.primary_amount' => 'required_with:settlement|numeric|min:0',
            'settlement.secondary_currency' => 'required_with:settlement|string|size:3',
        ]);

        try {
            $transaction = DB::transaction(function () use ($validated, $user) {
                $client = Client::whereKey($validated['client_id'])->lockForUpdate()->firstOrFail();
                TenantAccess::authorizeShop($user, $client->shop_id);
                $shopId = $client->shop_id;

                $activeSession = Session::open()
                    ->where('shop_id', $shopId)
                    ->lockForUpdate()
                    ->first();

                abort_unless(
                    $activeSession && (int) $client->session_id === (int) $activeSession->id,
                    403,
                    'Le client ne correspond pas à la session active.',
                );
                abort_if(
                    Transaction::where('client_id', $client->id)
                        ->where('session_id', $activeSession->id)
                        ->exists(),
                    409,
                    'Ce ticket a déjà été traité.',
                );

                $operationType = $client->operation_type;
                abort_unless(in_array($operationType, ['depot', 'retrait', 'change', 'paiement'], true), 422);
                $ticketAmount = $operationType === 'change'
                    ? $client->amount_from
                    : ($client->amount ?? $client->amount_from);
                $operationAmount = (float) ($ticketAmount ?: ($validated['amount_from'] ?? 0));
                abort_unless(
                    $operationAmount >= 0.01,
                    422,
                    'Le ticket ne contient pas de montant valide.',
                );

                abort_if(
                    $client->cashier_id && (int) $client->cashier_id !== $user->id,
                    403,
                    'Ce ticket appartient à un autre caissier.',
                );

                $cashSession = CashSession::query()
                    ->where('user_id', $user->id)
                    ->where('work_session_id', $activeSession->id)
                    ->where('status', 'open')
                    ->whereHas('register', fn ($query) => $query->where('shop_id', $shopId))
                    ->lockForUpdate()
                    ->first();
                abort_unless($cashSession, 409, 'Ouvrez votre session de caisse avant de traiter un ticket.');

                $transactionData = [
                    'client_id' => $client->id,
                    'operation_type' => $operationType,
                    'service' => $client->service,
                    'currency_from' => strtoupper((string) $client->currency_from),
                    'currency_to' => strtoupper((string) $client->currency_to),
                    'amount_from' => $operationAmount,
                    'cashier_email' => $user->email,
                    'shop_id' => $shopId,
                    'ticket_number' => $client->ticket_number,
                    'client_phone' => $client->phone,
                    'session_id' => $activeSession->id,
                    'commission' => 0,
                ];

                abort_unless(
                    preg_match('/^[A-Z]{3}$/', $transactionData['currency_from'])
                        && preg_match('/^[A-Z]{3}$/', $transactionData['currency_to']),
                    422,
                    'Devise invalide sur le ticket.',
                );

                if ($operationType === 'change') {
                    $pair = $transactionData['currency_from'].'_'.$transactionData['currency_to'];
                    $rate = ExchangeRate::where('currency_pair', $pair)
                        ->where('is_active', true)
                        ->first();
                    abort_if(! $rate, 422, 'Aucun taux serveur actif pour cette paire.');
                    $transactionData['exchange_rate'] = $rate->rate;
                    $transactionData['amount_to'] = round(
                        $operationAmount * $rate->rate,
                        2,
                    );
                } else {
                    $transactionData['exchange_rate'] = 1;
                    $transactionData['amount_to'] = $operationAmount;
                }

                if (isset($validated['settlement'])) {
                    abort_unless(
                        in_array($operationType, ['depot', 'retrait'], true),
                        422,
                        'Le règlement multidevise est réservé aux dépôts et retraits.',
                    );

                    $primaryAmount = round((float) $validated['settlement']['primary_amount'], 2);
                    $secondaryCurrency = strtoupper($validated['settlement']['secondary_currency']);
                    $primaryCurrency = $transactionData['currency_from'];
                    $remainingAmount = round($operationAmount - $primaryAmount, 2);

                    abort_unless(
                        $primaryAmount >= 0
                            && $primaryAmount < $operationAmount
                            && $remainingAmount >= 0.01
                            && preg_match('/^[A-Z]{3}$/', $secondaryCurrency)
                            && $secondaryCurrency !== $primaryCurrency,
                        422,
                        'La répartition multidevise est invalide.',
                    );

                    $settlementRate = ExchangeRate::query()
                        ->where('currency_pair', "{$primaryCurrency}_{$secondaryCurrency}")
                        ->where('is_active', true)
                        ->first();

                    abort_unless(
                        $settlementRate,
                        422,
                        "Aucun taux n’est configuré pour {$primaryCurrency} → {$secondaryCurrency}.",
                    );

                    $breakdown = [];
                    if ($primaryAmount > 0) {
                        $breakdown[] = [
                            'currency' => $primaryCurrency,
                            'amount' => $primaryAmount,
                            'equivalent_amount' => $primaryAmount,
                            'exchange_rate' => 1,
                        ];
                    }
                    $breakdown[] = [
                        'currency' => $secondaryCurrency,
                        'amount' => round($remainingAmount * $settlementRate->rate, 2),
                        'equivalent_amount' => $remainingAmount,
                        'exchange_rate' => $settlementRate->rate,
                    ];
                    $transactionData['settlement_breakdown'] = $breakdown;
                }

                $transaction = Transaction::create($transactionData);
                $this->cashService->syncTransaction($transaction, $cashSession);
                $client->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'cashier_id' => $user->id,
                    'counter_number' => $user->counter?->counter_number,
                ]);

                return $transaction;
            });
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        // Best-effort: never let a notification failure affect the response
        // the cashier just waited on for their transaction.
        $this->notifications->notify($transaction);

        return response()->json($transaction, 201);
    }
}
