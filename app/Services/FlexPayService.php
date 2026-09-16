<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin client for FlexPay's mobile money payment API. Never throws - callers
 * get a result array back and decide what to do; failures are logged.
 */
class FlexPayService
{
    public function isConfigured(): bool
    {
        return (bool) config('services.flexpay.base_url')
            && (bool) config('services.flexpay.merchant')
            && (bool) config('services.flexpay.token');
    }

    /**
     * Send a mobile money collection request (Payment Service).
     *
     * @return array{ok: bool, order_number: ?string, message: ?string}
     */
    public function initiatePayment(string $reference, string $phone, float $amount, string $currency, string $callbackUrl): array
    {
        $endpoint = rtrim((string) config('services.flexpay.base_url'), '/').'/api/rest/v1/paymentService';

        try {
            $response = Http::withToken((string) config('services.flexpay.token'))
                ->acceptJson()
                ->post($endpoint, [
                    'merchant' => config('services.flexpay.merchant'),
                    'type' => '1',
                    'reference' => $reference,
                    'phone' => $phone,
                    'amount' => (string) $amount,
                    'currency' => $currency,
                    'callbackUrl' => $callbackUrl,
                ]);
        } catch (\Throwable $exception) {
            Log::error('FlexPay paymentService request threw an exception.', [
                'reference' => $reference,
                'error' => $exception->getMessage(),
            ]);

            return ['ok' => false, 'order_number' => null, 'message' => 'Impossible de contacter FlexPay.'];
        }

        $body = $response->json();

        if ($response->failed() || (string) ($body['code'] ?? '1') !== '0') {
            Log::error('FlexPay paymentService request failed.', [
                'reference' => $reference,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'ok' => false,
                'order_number' => null,
                'message' => $body['message'] ?? 'La demande de paiement FlexPay a échoué.',
            ];
        }

        return [
            'ok' => true,
            'order_number' => $body['orderNumber'] ?? null,
            'message' => $body['message'] ?? null,
        ];
    }

    /**
     * Check the current status of a FlexPay transaction (Check transaction).
     *
     * @return array{found: bool, transaction: ?array, message: ?string}
     */
    public function checkTransaction(string $orderNumber): array
    {
        $endpoint = rtrim((string) config('services.flexpay.base_url'), '/')."/api/rest/v1/check/{$orderNumber}";

        try {
            $response = Http::withToken((string) config('services.flexpay.token'))
                ->acceptJson()
                ->get($endpoint);
        } catch (\Throwable $exception) {
            Log::error('FlexPay check transaction request threw an exception.', [
                'order_number' => $orderNumber,
                'error' => $exception->getMessage(),
            ]);

            return ['found' => false, 'transaction' => null, 'message' => 'Impossible de contacter FlexPay.'];
        }

        $body = $response->json();

        if ($response->failed() || (string) ($body['code'] ?? '1') !== '0' || empty($body['transaction'])) {
            return [
                'found' => false,
                'transaction' => null,
                'message' => $body['message'] ?? 'Aucune transaction trouvée.',
            ];
        }

        return [
            'found' => true,
            'transaction' => $body['transaction'],
            'message' => $body['message'] ?? null,
        ];
    }
}
