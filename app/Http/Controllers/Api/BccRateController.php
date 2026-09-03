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
     * Copy one BCC currency's buy/sell onto the shop's operative rate
     * against CDF - the pair ClientController/TransactionController actually
     * charge from. Re-fetches rather than trusting a client-supplied buy/sell,
     * so this can only ever apply what the BCC is really quoting right now.
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
        $pair = "{$code}_CDF";

        $exchangeRate = ExchangeRate::updateOrCreate(
            ['owner_id' => $ownerId, 'currency_pair' => $pair],
            [
                'buy_rate' => $rate['buy'],
                'sell_rate' => $rate['sell'],
                'is_active' => true,
            ],
        );

        CashierActivity::logAction(
            'configuration_change',
            "Taux {$pair} synchronisé depuis la BCC (achat {$rate['buy']}, vente {$rate['sell']})",
        );

        return response()->json($exchangeRate);
    }
}
