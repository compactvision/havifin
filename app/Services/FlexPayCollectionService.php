<?php

namespace App\Services;

use App\Jobs\PollFlexPayTransaction;
use App\Models\CashierActivity;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\FlexPayTransaction;
use App\Models\Session;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Starts and settles FlexPay auto-debit attempts on deposit and withdrawal
 * mobile money tickets. This is the single place a charge gets finalized, so
 * the polling job and the inbound webhook can race each other without
 * double-crediting the till.
 */
class FlexPayCollectionService
{
    public function __construct(
        private readonly FlexPayService $flexPay,
        private readonly CashService $cashService,
    ) {}

    public function charge(Client $client, User $cashier, ?string $phone = null): FlexPayTransaction
    {
        throw_unless($this->flexPay->isConfigured(), InvalidArgumentException::class, "FlexPay n'est pas configuré sur cette instance.");

        throw_unless(in_array($client->operation_type, ['depot', 'retrait'], true), InvalidArgumentException::class, 'Le prélèvement automatique est réservé aux dépôts et retraits.');
        throw_unless(in_array($client->status, ['called', 'calling'], true), InvalidArgumentException::class, 'Ce ticket doit être en cours pour être prélevé.');

        $client->loadMissing('institution');
        throw_unless($client->institution && $client->institution->type === 'mobile_money', InvalidArgumentException::class, 'Ce ticket n’est pas rattaché à un partenaire mobile money.');

        $amount = (float) ($client->amount ?? $client->amount_from ?? 0);
        throw_unless($amount >= 0.01, InvalidArgumentException::class, 'Le ticket ne contient pas de montant valide.');

        throw_if(
            FlexPayTransaction::where('client_id', $client->id)->where('status', 'pending')->exists(),
            InvalidArgumentException::class,
            'Un prélèvement automatique est déjà en cours pour ce ticket.',
        );

        $activeSession = Session::open()->where('shop_id', $client->shop_id)->first();
        throw_unless($activeSession, InvalidArgumentException::class, 'Aucune session active pour cette boutique.');

        $cashSession = CashSession::query()
            ->where('user_id', $cashier->id)
            ->where('work_session_id', $activeSession->id)
            ->where('status', 'open')
            ->whereHas('register', fn ($query) => $query->where('shop_id', $client->shop_id))
            ->first();
        throw_unless($cashSession, InvalidArgumentException::class, 'Ouvrez votre session de caisse avant de lancer un prélèvement automatique.');

        $phone = $phone ?: ($client->flexpay_phone ?: $client->phone);
        $reference = 'HVF-'.$client->ticket_number.'-'.Str::upper(Str::random(6));
        $currency = strtoupper((string) $client->currency_from);

        $flexPayTransaction = FlexPayTransaction::create([
            'client_id' => $client->id,
            'institution_id' => $client->institution_id,
            'shop_id' => $client->shop_id,
            'cashier_id' => $cashier->id,
            'cash_session_id' => $cashSession->id,
            'session_id' => $activeSession->id,
            'reference' => $reference,
            'phone' => $phone,
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'pending',
        ]);

        $callbackUrl = route('api.flexpay.callback', ['token' => config('services.flexpay.webhook_token')]);

        $result = $this->flexPay->initiatePayment($reference, $phone, $amount, $currency, $callbackUrl);

        if (! $result['ok']) {
            $flexPayTransaction->update([
                'status' => 'failed',
                'message' => $result['message'],
                'finalized_at' => now(),
            ]);

            throw new InvalidArgumentException($result['message'] ?? 'La demande FlexPay a échoué.');
        }

        $flexPayTransaction->update(['order_number' => $result['order_number']]);

        PollFlexPayTransaction::dispatch($flexPayTransaction->id)
            ->delay(now()->addSeconds((int) config('services.flexpay.poll_interval_seconds')));

        return $flexPayTransaction;
    }

    /**
     * Apply the latest known status (from a poll or a callback) to a FlexPay
     * transaction, finalizing the ticket on success. Idempotent: a status
     * already marked terminal/finalized is left untouched.
     */
    public function applyCheckResult(FlexPayTransaction $flexPayTransaction, array $transaction): FlexPayTransaction
    {
        if ($flexPayTransaction->isTerminal()) {
            return $flexPayTransaction;
        }

        $status = $this->mapStatus((string) ($transaction['status'] ?? '2'));

        $flexPayTransaction->update([
            'status' => $status,
            'provider_status_code' => $transaction['status'] ?? null,
            'provider_reference' => $transaction['provider_reference'] ?? null,
            'channel' => $transaction['channel'] ?? null,
            'amount_customer' => $transaction['amountCustomer'] ?? null,
            'raw_response' => $transaction,
            'last_checked_at' => now(),
        ]);

        if ($status === 'success') {
            $this->finalizeSuccess($flexPayTransaction);
        }

        return $flexPayTransaction->fresh();
    }

    private function mapStatus(string $code): string
    {
        return match ($code) {
            '0' => 'success',
            '1' => 'failed',
            '3' => 'refund_pending',
            '4' => 'refunded',
            '5' => 'cancelled',
            default => 'pending',
        };
    }

    private function finalizeSuccess(FlexPayTransaction $flexPayTransaction): void
    {
        DB::transaction(function () use ($flexPayTransaction) {
            $locked = FlexPayTransaction::whereKey($flexPayTransaction->id)->lockForUpdate()->firstOrFail();

            if ($locked->finalized_at) {
                return;
            }

            $client = Client::whereKey($locked->client_id)->lockForUpdate()->firstOrFail();

            if ($client->status === 'completed') {
                $locked->update(['finalized_at' => now()]);

                return;
            }

            $cashSession = $this->resolveCashSession($locked);

            if (! $cashSession) {
                CashierActivity::create([
                    'cashier_id' => $locked->cashier_id,
                    'session_id' => $locked->session_id,
                    'client_id' => $client->id,
                    'activity_type' => 'flexpay_unsynced_success',
                    'description' => "Prélèvement FlexPay confirmé pour le ticket #{$client->ticket_number} mais aucune session de caisse ouverte n'a été trouvée pour synchroniser le montant. Intervention manuelle requise.",
                    'created_at' => now(),
                ]);

                return;
            }

            try {
                // Nested (savepoint) transaction: if the caisse sync fails
                // (e.g. insufficient till balance), only this part rolls
                // back - the CashierActivity alert below still needs to
                // commit with the outer transaction.
                $transaction = DB::transaction(function () use ($client, $locked, $cashSession) {
                    $transaction = Transaction::create([
                        'client_id' => $client->id,
                        'operation_type' => $client->operation_type,
                        'service' => $client->service,
                        'institution_id' => $client->institution_id,
                        'currency_from' => $locked->currency,
                        'currency_to' => $locked->currency,
                        'amount_from' => (float) $locked->amount,
                        'amount_to' => (float) $locked->amount,
                        'exchange_rate' => 1,
                        'commission' => 0,
                        'cashier_email' => $locked->cashier?->email,
                        'shop_id' => $locked->shop_id,
                        'ticket_number' => $client->ticket_number,
                        'client_phone' => $client->phone,
                        'session_id' => $locked->session_id,
                    ]);

                    $this->cashService->syncTransaction($transaction, $cashSession);

                    return $transaction;
                });
            } catch (\Throwable $exception) {
                // Never let a caisse-side failure silently swallow a
                // confirmed FlexPay charge - flag it for manual
                // reconciliation instead.
                CashierActivity::create([
                    'cashier_id' => $locked->cashier_id,
                    'session_id' => $locked->session_id,
                    'client_id' => $client->id,
                    'activity_type' => 'flexpay_unsynced_success',
                    'description' => "Prélèvement FlexPay confirmé pour le ticket #{$client->ticket_number} mais la synchronisation de caisse a échoué ({$exception->getMessage()}). Intervention manuelle requise.",
                    'created_at' => now(),
                ]);

                return;
            }

            $client->update([
                'status' => 'completed',
                'completed_at' => now(),
                'cashier_id' => $locked->cashier_id,
            ]);

            $locked->update([
                'transaction_id' => $transaction->id,
                'finalized_at' => now(),
            ]);
        });
    }

    private function resolveCashSession(FlexPayTransaction $flexPayTransaction): ?CashSession
    {
        $cashSession = $flexPayTransaction->cash_session_id
            ? CashSession::whereKey($flexPayTransaction->cash_session_id)->where('status', 'open')->first()
            : null;

        if ($cashSession) {
            return $cashSession;
        }

        if (! $flexPayTransaction->cashier_id) {
            return null;
        }

        return CashSession::query()
            ->where('user_id', $flexPayTransaction->cashier_id)
            ->where('status', 'open')
            ->whereHas('register', fn ($query) => $query->where('shop_id', $flexPayTransaction->shop_id))
            ->first();
    }
}
