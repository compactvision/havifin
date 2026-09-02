<?php

namespace App\Services;

use App\Mail\OperationReceiptMail;
use App\Models\Transaction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Notifies a client that their operation has been completed, by email (when
 * an address is on file) and WhatsApp. Both channels are best-effort: a
 * failure here must never break the cashier's transaction flow.
 */
class OperationNotificationService
{
    public function __construct(private WhatsAppNotifier $whatsApp)
    {
    }

    public function notify(Transaction $transaction): void
    {
        $transaction->loadMissing(['client', 'shop']);
        $client = $transaction->client;

        if ($client?->email) {
            try {
                Mail::to($client->email)->send(new OperationReceiptMail($transaction));
            } catch (\Throwable $exception) {
                Log::error('Failed to send operation receipt email.', [
                    'transaction_id' => $transaction->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $phone = $client?->phone ?? $transaction->client_phone;

        if ($phone) {
            try {
                $this->whatsApp->send($phone, $this->buildMessage($transaction));
            } catch (\Throwable $exception) {
                Log::error('Failed to send operation WhatsApp notification.', [
                    'transaction_id' => $transaction->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    private function buildMessage(Transaction $transaction): string
    {
        $shopName = $transaction->shop->name ?? 'Havifin';
        $client = $transaction->client;
        $firstName = $client?->first_name ?: '';
        $greeting = $firstName ? "Bonjour {$firstName}," : 'Bonjour,';

        $amountLine = '';
        if ($transaction->amount_from) {
            $amountLine = sprintf(
                "\nMontant : %s %s",
                number_format((float) $transaction->amount_from, 2),
                $transaction->currency_from,
            );
        }

        return sprintf(
            "%s\n\nVotre opération *%s* (ticket #%s) chez %s a été traitée avec succès.%s\n\nMerci de votre confiance, à la prochaine ! 🙏",
            $greeting,
            $transaction->service ?: $transaction->operation_type,
            $transaction->ticket_number,
            $shopName,
            $amountLine,
        );
    }
}
