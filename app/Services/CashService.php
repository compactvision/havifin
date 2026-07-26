<?php

namespace App\Services;

use App\Models\CashAuditLog;
use App\Models\CashBalance;
use App\Models\CashierActivity;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\CashSessionAmount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CashService
{
    /**
     * Open a new cash session for a user on a register.
     */
    public function openSession(User $user, CashRegister $register, array $openingAmounts, ?string $notes = null, ?int $workSessionId = null): CashSession
    {
        return DB::transaction(function () use ($user, $register, $openingAmounts, $notes, $workSessionId) {
            $lockedRegister = CashRegister::whereKey($register->id)->lockForUpdate()->firstOrFail();
            if ($lockedRegister->activeSession()->exists()) {
                throw new InvalidArgumentException('A session is already open on this register.');
            }

            // 1. Create the session
            $session = CashSession::create([
                'cash_register_id' => $register->id,
                'user_id' => $user->id,
                'status' => 'open',
                'opened_at' => now(),
                'opening_notes' => $notes,
                'work_session_id' => $workSessionId,
                'owner_id' => $register->shop->owner_id, // Inherit from shop
            ]);

            // 2. Record opening amounts (e.g. counting the physical cash)
            foreach ($openingAmounts as $currency => $amount) {
                $currency = strtoupper((string) $currency);
                if (! preg_match('/^[A-Z]{3}$/', $currency)) {
                    throw new InvalidArgumentException('Invalid currency code.');
                }
                CashSessionAmount::create([
                    'cash_session_id' => $session->id,
                    'currency' => $currency,
                    'opening_amount' => $amount,
                    'owner_id' => $register->shop->owner_id,
                ]);

                CashBalance::updateOrCreate(
                    [
                        'cash_register_id' => $register->id,
                        'currency' => $currency,
                    ],
                    [
                        'amount' => (float) $amount,
                        'owner_id' => $register->shop->owner_id,
                    ],
                );
            }

            $this->audit('opened_session', $session, null, $session->toArray());

            return $session;
        });
    }

    /**
     * Close a cash session.
     */
    public function closeSession(CashSession $session, array $closingAmounts, ?string $notes = null): CashSession
    {
        return DB::transaction(function () use ($session, $closingAmounts, $notes) {
            $lockedSession = CashSession::whereKey($session->id)->lockForUpdate()->firstOrFail();
            if ($lockedSession->status !== 'open') {
                throw new InvalidArgumentException('Session is already closed.');
            }

            $oldValues = $lockedSession->toArray();
            $lockedSession->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closing_notes' => $notes,
                'closed_by' => auth()->id(),
            ]);

            foreach ($closingAmounts as $currency => $amount) {
                $currency = strtoupper((string) $currency);
                if (! preg_match('/^[A-Z]{3}$/', $currency)) {
                    throw new InvalidArgumentException('Invalid currency code.');
                }
                // Get the theoretical balance from CashBalances or sum of movements
                // Here we rely on CashBalances for real-time theoretical tracking
                $theoreticalBalance = $this->getBalance($lockedSession->register, $currency);

                CashSessionAmount::updateOrCreate(
                    ['cash_session_id' => $lockedSession->id, 'currency' => $currency],
                    [
                        'closing_amount_real' => $amount,
                        'closing_amount_theoretical' => $theoreticalBalance,
                        'difference' => $amount - $theoreticalBalance,
                        'owner_id' => $lockedSession->owner_id,
                    ]
                );
            }

            $this->audit('closed_session', $lockedSession, $oldValues, $lockedSession->fresh()->toArray());

            return $lockedSession;
        });
    }

    /**
     * Record a movement of cash.
     */
    public function recordMovement(
        CashSession $session,
        string $type,
        float $amount,
        string $currency,
        ?string $description = null,
        ?int $transactionId = null,
        array $metadata = []
    ): CashMovement {
        return DB::transaction(function () use ($session, $type, $amount, $currency, $description, $transactionId, $metadata) {
            $lockedSession = CashSession::whereKey($session->id)->lockForUpdate()->firstOrFail();
            if ($lockedSession->status !== 'open') {
                throw new InvalidArgumentException('Cannot record movement on a closed session.');
            }
            $currency = strtoupper($currency);
            if (! preg_match('/^[A-Z]{3}$/', $currency)) {
                throw new InvalidArgumentException('Invalid currency code.');
            }

            $balance = CashBalance::where('cash_register_id', $lockedSession->cash_register_id)
                ->where('currency', $currency)
                ->lockForUpdate()
                ->first();

            if (! $balance) {
                $balance = CashBalance::create([
                    'cash_register_id' => $lockedSession->cash_register_id,
                    'currency' => $currency,
                    'amount' => 0,
                    'owner_id' => $lockedSession->owner_id,
                ]);
            }

            if ((float) $balance->amount + $amount < 0) {
                throw new InvalidArgumentException("Solde {$currency} insuffisant pour cette opération.");
            }

            $movement = CashMovement::create([
                'cash_session_id' => $lockedSession->id,
                'user_id' => auth()->id() ?? $lockedSession->user_id,
                'transaction_id' => $transactionId,
                'type' => $type,
                'currency' => $currency,
                'amount' => $amount,
                'description' => $description,
                'metadata' => $metadata,
                'owner_id' => $lockedSession->owner_id,
            ]);

            $balance->increment('amount', $amount);
            $this->audit('cash_movement', $movement, null, $movement->toArray());

            CashierActivity::create([
                'cashier_id' => auth()->id() ?? $lockedSession->user_id,
                'session_id' => $lockedSession->work_session_id,
                'activity_type' => 'complete_transaction',
                'description' => "Mouvement de caisse ($type): ".($metadata['performed_by'] ?? 'Système')." - $amount $currency - $description",
                'created_at' => now(),
            ]);

            return $movement;
        });
    }

    /**
     * Get current theoretical balance.
     */
    public function getBalance(CashRegister $register, string $currency): float
    {
        $balance = CashBalance::where('cash_register_id', $register->id)
            ->where('currency', $currency)
            ->first();

        return $balance ? (float) $balance->amount : 0.0;
    }

    /**
     * Synchronize a transaction with the cash register.
     */
    public function syncTransaction(Transaction $transaction, CashSession $session): void
    {
        if ($session->status !== 'open' || (int) $session->register->shop_id !== (int) $transaction->shop_id) {
            throw new InvalidArgumentException('Invalid cash session for this transaction.');
        }

        $type = strtolower($transaction->operation_type); // retrait, depot, change

        if ($type === 'retrait') {
            if ($transaction->settlement_breakdown) {
                foreach ($transaction->settlement_breakdown as $line) {
                    $this->recordMovement(
                        $session,
                        'withdrawal',
                        -abs((float) $line['amount']),
                        $line['currency'],
                        "Retrait multidevise #{$transaction->ticket_number}",
                        $transaction->id,
                        ['settlement' => $line],
                    );
                }

                return;
            }

            // Withdrawal: Cashier gives cash (Subtract from register)
            $this->recordMovement(
                $session,
                'withdrawal',
                -abs($transaction->amount_from),
                $transaction->currency_from,
                "Retrait #{$transaction->ticket_number}",
                $transaction->id
            );
        } elseif (in_array($type, ['depot', 'paiement'], true)) {
            // Deposit/payment: the client gives cash to the cashier.
            $label = $type === 'paiement' ? 'Paiement' : 'Dépôt';
            if ($type === 'depot' && $transaction->settlement_breakdown) {
                foreach ($transaction->settlement_breakdown as $line) {
                    $this->recordMovement(
                        $session,
                        'deposit',
                        abs((float) $line['amount']),
                        $line['currency'],
                        "Dépôt multidevise #{$transaction->ticket_number}",
                        $transaction->id,
                        ['settlement' => $line],
                    );
                }

                return;
            }

            $this->recordMovement(
                $session,
                'deposit',
                abs($transaction->amount_from),
                $transaction->currency_from,
                "{$label} #{$transaction->ticket_number}",
                $transaction->id
            );
        } elseif ($type === 'change') {
            // Exchange:
            // 1. Add currency received from client
            $this->recordMovement(
                $session,
                'exchange_in',
                abs($transaction->amount_from),
                $transaction->currency_from,
                "Change #{$transaction->ticket_number} (Reçu)",
                $transaction->id
            );
            // 2. Subtract currency given to client
            $this->recordMovement(
                $session,
                'exchange_out',
                -abs($transaction->amount_to),
                $transaction->currency_to,
                "Change #{$transaction->ticket_number} (Donné)",
                $transaction->id
            );
        }
    }

    private function audit(string $event, Model $auditable, ?array $oldValues, ?array $newValues): void
    {
        CashAuditLog::create([
            'event' => $event,
            'user_id' => auth()->id() ?? $auditable->getAttribute('user_id'),
            'auditable_type' => $auditable::class,
            'auditable_id' => $auditable->getKey(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()?->ip(),
            'user_agent' => substr((string) request()?->userAgent(), 0, 255),
        ]);
    }
}
