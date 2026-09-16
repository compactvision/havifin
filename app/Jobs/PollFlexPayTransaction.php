<?php

namespace App\Jobs;

use App\Models\FlexPayTransaction;
use App\Services\FlexPayCollectionService;
use App\Services\FlexPayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Actively verifies a FlexPay charge instead of relying solely on the
 * callback - re-dispatches itself with a delay until the transaction reaches
 * a terminal status or the attempt budget runs out.
 */
class PollFlexPayTransaction implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $flexPayTransactionId,
        public int $attempt = 1,
    ) {}

    public function handle(FlexPayService $flexPay, FlexPayCollectionService $collection): void
    {
        $flexPayTransaction = FlexPayTransaction::find($this->flexPayTransactionId);

        if (! $flexPayTransaction || $flexPayTransaction->isTerminal() || $flexPayTransaction->finalized_at) {
            return;
        }

        if (! $flexPayTransaction->order_number) {
            return;
        }

        $flexPayTransaction->increment('attempts');

        $result = $flexPay->checkTransaction($flexPayTransaction->order_number);

        if ($result['found']) {
            $flexPayTransaction = $collection->applyCheckResult($flexPayTransaction, $result['transaction']);
        }

        if ($flexPayTransaction->isTerminal()) {
            return;
        }

        $maxAttempts = (int) config('services.flexpay.poll_max_attempts');

        if ($this->attempt >= $maxAttempts) {
            $flexPayTransaction->update(['status' => 'timeout']);

            return;
        }

        self::dispatch($flexPayTransaction->id, $this->attempt + 1)
            ->delay(now()->addSeconds((int) config('services.flexpay.poll_interval_seconds')));
    }
}
