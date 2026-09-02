<?php

namespace App\Mail;

use App\Models\Transaction;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OperationReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Transaction $transaction)
    {
    }

    public function build(): self
    {
        return $this
            ->subject("Votre opération #{$this->transaction->ticket_number} - ".($this->transaction->shop->name ?? 'Havifin'))
            ->view('emails.operation-receipt', [
                'transaction' => $this->transaction,
                'client' => $this->transaction->client,
                'shopName' => $this->transaction->shop->name ?? 'Havifin',
            ]);
    }
}
