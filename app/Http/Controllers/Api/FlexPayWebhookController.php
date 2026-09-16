<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlexPayTransaction;
use App\Services\FlexPayCollectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FlexPayWebhookController extends Controller
{
    public function __construct(private readonly FlexPayCollectionService $collection) {}

    /**
     * FlexPay's callback for a payment result. We don't rely on this alone
     * (see PollFlexPayTransaction) - it's a fast path when it does arrive.
     */
    public function handle(Request $request)
    {
        $expectedToken = (string) config('services.flexpay.webhook_token');

        if ($expectedToken !== '' && $request->query('token') !== $expectedToken) {
            abort(403);
        }

        $orderNumber = $request->input('orderNumber');
        $reference = $request->input('reference');

        $flexPayTransaction = FlexPayTransaction::query()
            ->when($orderNumber, fn ($query) => $query->where('order_number', $orderNumber))
            ->when(! $orderNumber && $reference, fn ($query) => $query->where('reference', $reference))
            ->first();

        if (! $flexPayTransaction) {
            Log::warning('FlexPay callback received for an unknown transaction.', $request->all());

            return response()->json(['message' => 'Transaction inconnue'], 404);
        }

        // The callback payload only carries a binary success code (0 = ok),
        // unlike the check-transaction endpoint's richer 0-5 status - map it
        // onto the same shape so applyCheckResult() can handle both sources.
        $code = (string) $request->input('code', '1');

        $this->collection->applyCheckResult($flexPayTransaction, [
            'status' => $code === '0' ? '0' : '1',
            'provider_reference' => $request->input('provider_reference'),
            'channel' => $request->input('channel'),
            'amountCustomer' => $request->input('amountCustomer'),
        ]);

        return response()->json(['message' => 'ok']);
    }
}
