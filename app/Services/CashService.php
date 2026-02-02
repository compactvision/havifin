<?php

namespace App\Services;

use App\Models\CashBalance;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\CashSessionAmount;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CashService
{
    /**
     * Open a new cash session for a user on a register.
     */
    public function openSession(User $user, CashRegister $register, array $openingAmounts, ?string $notes = null, ?int $workSessionId = null): CashSession
    {
        if ($register->activeSession) {
            throw new InvalidArgumentException("A session is already open on this register.");
        }

        return DB::transaction(function () use ($user, $register, $openingAmounts, $notes, $workSessionId) {
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
                CashSessionAmount::create([
                    'cash_session_id' => $session->id,
                    'currency' => $currency,
                    'opening_amount' => $amount,
                    'owner_id' => $register->shop->owner_id,
                ]);
            }

            return $session;
        });
    }

    /**
     * Close a cash session.
     */
    public function closeSession(CashSession $session, array $closingAmounts, ?string $notes = null): CashSession
    {
        if ($session->status !== 'open') {
            throw new InvalidArgumentException("Session is already closed.");
        }

        return DB::transaction(function () use ($session, $closingAmounts, $notes) {
            $session->update([
                'status' => 'closed',
                'closed_at' => now(),
                'closing_notes' => $notes,
                'closed_by' => auth()->id(), // Assuming closure is done by auth user
            ]);

            foreach ($closingAmounts as $currency => $amount) {
                // Get the theoretical balance from CashBalances or sum of movements
                // Here we rely on CashBalances for real-time theoretical tracking
                $theoreticalBalance = $this->getBalance($session->register, $currency);

                CashSessionAmount::updateOrCreate(
                    ['cash_session_id' => $session->id, 'currency' => $currency],
                    [
                        'closing_amount_real' => $amount,
                        'closing_amount_theoretical' => $theoreticalBalance,
                        'difference' => $amount - $theoreticalBalance,
                        'owner_id' => $session->owner_id,
                    ]
                );
            }

            return $session;
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
        if ($session->status !== 'open') {
            throw new InvalidArgumentException("Cannot record movement on a closed session.");
        }

        return DB::transaction(function () use ($session, $type, $amount, $currency, $description, $transactionId, $metadata) {
            // 1. Create Movement Record
            $movement = CashMovement::create([
                'cash_session_id' => $session->id,
                'user_id' => auth()->id() ?? $session->user_id, // Default to session owner if system action
                'transaction_id' => $transactionId,
                'type' => $type,
                'currency' => $currency,
                'amount' => $amount,
                'description' => $description,
                'metadata' => $metadata,
                'owner_id' => $session->owner_id,
            ]);

            // 2. Update Real-time Balance
            $balance = CashBalance::firstOrCreate(
                ['cash_register_id' => $session->cash_register_id, 'currency' => $currency],
                ['amount' => 0, 'owner_id' => $session->owner_id]
            );

            // In is +, Out is -
            $balance->amount += $amount;
            $balance->save();

            // 3. Automatically record Activity for consistent logging
            // We only log if it's not a background sync (optional, but requested to track all)
            \App\Models\CashierActivity::create([
                'cashier_id' => auth()->id() ?? $session->user_id,
                'session_id' => $session->work_session_id,
                'activity_type' => 'complete_transaction',
                'description' => "Mouvement de caisse ($type): " . ($metadata['performed_by'] ?? 'Système') . " - $amount $currency - $description",
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
    public function syncTransaction(\App\Models\Transaction $transaction): void
    {
        // 1. Find active cash session for this shop/cashier
        // We look for an open session in the transaction's shop
        $session = CashSession::where('status', 'open')
            ->whereHas('register', function ($q) use ($transaction) {
                $q->where('shop_id', $transaction->shop_id);
            })
            ->latest()
            ->first();

        if (!$session) {
            return;
        }

        $type = strtolower($transaction->operation_type); // retrait, depot, change

        if ($type === 'retrait') {
            // Withdrawal: Cashier gives cash (Subtract from register)
            $this->recordMovement(
                $session,
                'withdrawal',
                -abs($transaction->amount_from),
                $transaction->currency_from,
                "Retrait #{$transaction->ticket_number}",
                $transaction->id
            );
        } elseif ($type === 'depot') {
            // Deposit: Client gives cash (Add to register)
            $this->recordMovement(
                $session,
                'deposit',
                abs($transaction->amount_from),
                $transaction->currency_from,
                "Dépôt #{$transaction->ticket_number}",
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
}
