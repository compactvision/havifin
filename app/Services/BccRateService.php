<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BccRateService
{
    private const ENDPOINT = 'https://exchange-rate-drc.vercel.app/v1/rates/latest';

    private const CACHE_KEY = 'bcc-rates-latest';

    private const CACHE_TTL_SECONDS = 600;

    /**
     * Reference rates from the Banque Centrale du Congo, for comparison only
     * - applying one to a local pair is a separate, explicit action. Cached
     * for 10 minutes so a screen showing this doesn't hammer a third-party
     * API on every poll; pass $fresh to bypass that for an explicit sync.
     *
     * @return array{rates: array, asOfDate: ?string, fetchedAt: ?string}
     */
    public function fetch(bool $fresh = false): array
    {
        if ($fresh) {
            Cache::forget(self::CACHE_KEY);
        }

        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function () {
            $response = Http::timeout(8)
                ->retry(2, 300)
                ->get(self::ENDPOINT, ['includeSuspect' => 'false']);

            if (! $response->successful()) {
                Log::warning('BCC rate fetch failed', ['status' => $response->status()]);
                throw new \RuntimeException('Impossible de récupérer les taux de la BCC.');
            }

            $body = $response->json();

            return [
                'rates' => $body['data']['rates'] ?? [],
                'asOfDate' => $body['data']['asOfDate'] ?? null,
                'fetchedAt' => $body['meta']['fetchedAt'] ?? now()->toIso8601String(),
            ];
        });
    }

    public function findByCode(string $code, bool $fresh = false): ?array
    {
        $code = strtoupper($code);

        return collect($this->fetch($fresh)['rates'])
            ->firstWhere('code', $code);
    }
}
