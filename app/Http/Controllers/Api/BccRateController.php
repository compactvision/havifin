<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\ExchangeRate;
use App\Services\BccRateService;
use App\Support\TenantAccess;
use Illuminate\Http\Request;

class BccRateController extends Controller
{
    public function __construct(private readonly BccRateService $bcc) {}

    /**
     * Reference rates from the BCC, for the manager to compare against - not
     * applied anywhere until they explicitly ask to.
     */
    public function index(Request $request)
    {
        try {
            return response()->json($this->bcc->fetch($request->boolean('refresh')));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    /**
     * Copy one BCC currency's buy/sell onto the shop's two operative,
     * directional pairs against CDF - ClientController looks up a pair by
     * its exact "{from}_{to}" string and charges from its single `rate`
     * (buy_rate) column, so both directions need their own row:
     *
     *  - "{code}_CDF" - a client sells us {code}, we hand over CDF. Same
     *    orientation as the BCC's own "achat" (the bank buying foreign
     *    currency too), so it's used as-is: CDF per 1 {code}.
     *  - "CDF_{code}" - a client buys {code} from us with CDF. Our
     *    convention for this direction is the reciprocal (1 CDF = ? in
     *    {code}), so the BCC's "vente" (CDF charged per 1 {code} sold) has
     *    to be inverted before it's stored.
     *
     * Re-fetches rather than trusting a client-supplied buy/sell, so this
     * can only ever apply what the BCC is really quoting right now.
     */
    public function apply(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|size:3|alpha',
        ]);
        $code = strtoupper($validated['code']);

        if ($code === 'CDF') {
            abort(422, 'CDF est la devise de référence, il n’y a pas de paire à créer.');
        }

        $rate = $this->bcc->findByCode($code, fresh: true);
        abort_if(! $rate, 404, "Aucun taux BCC trouvé pour {$code}.");
        abort_if(($rate['quality'] ?? null) !== 'OK', 422, "Le taux BCC pour {$code} est marqué douteux, non appliqué.");

        $ownerId = TenantAccess::ownerId($request->user());

        $buyPair = ExchangeRate::updateOrCreate(
            ['owner_id' => $ownerId, 'currency_pair' => "{$code}_CDF"],
            [
                'buy_rate' => $rate['buy'],
                'sell_rate' => $rate['buy'],
                'is_active' => true,
            ],
        );

        $sellPair = ExchangeRate::updateOrCreate(
            ['owner_id' => $ownerId, 'currency_pair' => "CDF_{$code}"],
            [
                'buy_rate' => 1 / $rate['sell'],
                'sell_rate' => 1 / $rate['sell'],
                'is_active' => true,
            ],
        );

        CashierActivity::logAction(
            'configuration_change',
            "Taux {$code}/CDF synchronisé depuis la BCC ({$code}_CDF: {$buyPair->buy_rate}, CDF_{$code}: {$sellPair->buy_rate})",
        );

        return response()->json(['buy_pair' => $buyPair, 'sell_pair' => $sellPair]);
    }
}
