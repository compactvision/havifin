<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Services\CashService; // Added

class TransactionObserver
{
    protected $cashService;

    public function __construct(CashService $cashService)
    {
        $this->cashService = $cashService;
    }

    /**
     * Handle the Transaction "created" event.
     */
    public function created(Transaction $transaction): void
    {
        // 1. Find the active cash session for this transaction's session/cashier
        // The transaction has a 'session_id' which links to 'work_sessions' (App\Models\Session)
        // usage: $transaction->session gives proper Session model.
        
        // However, we need the *CashSession*.
        // If we link CashSession to WorkSession, we can find it via that.
        // CashSession::where('work_session_id', $transaction->session_id)->first();
        
        // Alternatively, if transaction is created by a user, we can find their active CashSession.
        // Let's rely on work_session_id if available, or user active session.
        
        $cashSession = null;
        if ($transaction->session_id) {
            $cashSession = \App\Models\CashSession::where('work_session_id', $transaction->session_id)->first();
        }

        if (!$cashSession) {
             // Fallback: try to find open session for the owner of transaction (cashier)
             // But owner_id in Transaction might be the shop owner, not the cashier user.
             // We need the 'performed by' user. Transaction doesn't seem to have 'user_id' directly, 
             // but it has 'cashier_email' or we can infer it if we tracked who created it.
             // Standard laravel Observer methods runs in same request, so auth()->user() might be the cashier.
             
             if (auth()->check()) {
                 $user = auth()->user();
                 // Check if this user is a cashier or has a cash session
                 $cashSession = \App\Models\CashSession::where('user_id', $user->id)
                                    ->where('status', 'open')
                                    ->latest()
                                    ->first();
             }
        }

        if ($cashSession) {
            // Determine movement details based on transaction type
            // e.g. "deposit" -> Cash IN (Positive)
            // "withdrawal" -> Cash OUT (Negative)
            // "exchange" -> Checks currency_from and currency_to
            
            // This logic depends on Transaction 'operation_type'
            
            // Example logic (simplified):
            if ($transaction->operation_type === 'deposit') {
                 $this->cashService->recordMovement(
                    $cashSession,
                    'deposit',
                    $transaction->amount_to, // Amount received by system? Or AmountFrom? 
                    // Usually deposit: Client gives Cash (AmountFrom) -> System has Cash.
                    // So we add AmountFrom in CurrencyFrom.
                    $transaction->currency_from,
                    'Transaction #' . $transaction->ticket_number,
                    $transaction->id
                 );
            } elseif ($transaction->operation_type === 'withdrawal') {
                 // Withdrawal: Client wants Cash. System gives Cash.
                 // We subtract AmountTo in CurrencyTo.
                 $this->cashService->recordMovement(
                    $cashSession,
                    'withdrawal',
                    -$transaction->amount_to,
                    $transaction->currency_to,
                     'Transaction #' . $transaction->ticket_number,
                    $transaction->id
                 );
            } elseif ($transaction->operation_type === 'exchange') {
                 // Exchange: Client gives Cash A (IN), System gives Cash B (OUT).
                 // We need TWO movements? Or one if we track per-currency balance separately?
                 // CashService/Movement tracks one currency per row.
                 // So we record TWO movements.
                 
                 // 1. IN (Currency From)
                 $this->cashService->recordMovement(
                    $cashSession,
                    'exchange_in',
                     $transaction->amount_from,
                     $transaction->currency_from,
                     'Exchange IN #' . $transaction->ticket_number,
                     $transaction->id
                 );
                 
                 // 2. OUT (Currency To)
                 $this->cashService->recordMovement(
                    $cashSession,
                    'exchange_out',
                     -$transaction->amount_to,
                     $transaction->currency_to,
                     'Exchange OUT #' . $transaction->ticket_number,
                     $transaction->id
                 );
            }
        }
    }

    /**
     * Handle the Transaction "updated" event.
     */
    public function updated(Transaction $transaction): void
    {
        //
    }

    /**
     * Handle the Transaction "deleted" event.
     */
    public function deleted(Transaction $transaction): void
    {
        //
    }

    /**
     * Handle the Transaction "restored" event.
     */
    public function restored(Transaction $transaction): void
    {
        //
    }

    /**
     * Handle the Transaction "force deleted" event.
     */
    public function forceDeleted(Transaction $transaction): void
    {
        //
    }
}
