<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\FlexPayTransaction;
use App\Services\FlexPayCollectionService;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use InvalidArgumentException;

class FlexPayController extends Controller
{
    public function __construct(private readonly FlexPayCollectionService $collection) {}

    /**
     * Trigger a FlexPay auto-debit push for a mobile money deposit ticket.
     */
    public function charge(Request $request, Client $client)
    {
        $user = $request->user();
        TenantAccess::authorizeShop($user, $client->shop_id);

        $validated = $request->validate([
            'phone' => 'nullable|string|max:30',
        ]);

        try {
            $flexPayTransaction = $this->collection->charge($client, $user, $validated['phone'] ?? null);
        } catch (InvalidArgumentException $exception) {
            $status = str_contains($exception->getMessage(), "n'est pas configuré") ? 503 : 409;

            return response()->json(['message' => $exception->getMessage()], $status);
        }

        return response()->json($flexPayTransaction->fresh(), 202);
    }

    /**
     * Latest FlexPay charge attempt for a ticket, polled by the frontend
     * while waiting for confirmation.
     */
    public function status(Request $request, Client $client)
    {
        TenantAccess::authorizeShop($request->user(), $client->shop_id);

        $flexPayTransaction = FlexPayTransaction::where('client_id', $client->id)
            ->latest('id')
            ->first();

        // response()->json(null) serializes to `{}`, indistinguishable from a
        // real (if empty) transaction - wrap it so "no charge yet" is explicit.
        return response()->json(['transaction' => $flexPayTransaction]);
    }
}
