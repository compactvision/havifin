<?php

namespace App\Services;

class TicketService
{
    /**
     * Prepare ticket data for the local print server to consume.
     *
     * @param  array|object  $transaction
     */
    public function generateTransactionTicket($transaction): array
    {
        // Check if the transaction is an object/model and convert or extract accordingly.
        // We assume $transaction has the minimal properties. If it's an array, we handle that as well.

        $amount = is_array($transaction) ? ($transaction['amount'] ?? 0) : ($transaction->amount ?? 0);
        $reference = is_array($transaction) ? ($transaction['reference'] ?? 'ERR-REF') : ($transaction->reference ?? 'ERR-REF');
        $currency = is_array($transaction) ? ($transaction['currency'] ?? 'FC') : ($transaction->currency ?? 'FC');
        $date = is_array($transaction) ? ($transaction['created_at'] ?? now()) : ($transaction->created_at ?? now());
        $type = is_array($transaction) ? ($transaction['type'] ?? 'Achat') : ($transaction->type ?? 'Achat');

        // This structure precisely matches the expectations of our Node.js print-server bridge.
        return [
            'shopName' => config('app.name', 'Havifin'),
            'address' => 'Agence Havifin', // This could be fetched from the logged-in agent/merchant's profile.
            'reference' => $reference,
            'date' => is_string($date) ? $date : $date->format('d/m/Y H:i'),
            'amount' => number_format((float) $amount, 2, ',', ' '),
            'currency' => $currency,
            'items' => [
                [
                    'name' => 'Opération: '.ucfirst($type),
                    'amount' => number_format((float) $amount, 2, ',', ' '),
                ],
            ],
            // 'qrData' => $reference // Optional: enable this if you want a QR code of the reference printed.
        ];
    }
}
