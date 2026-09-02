<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Support\TenantAccess;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    /**
     * Download a PDF receipt for a single transaction.
     */
    public function show(Request $request, Transaction $transaction)
    {
        TenantAccess::authorizeShop($request->user(), $transaction->shop_id);

        $transaction->loadMissing(['client', 'shop']);

        $pdf = Pdf::loadView('receipts.operation', [
            'transaction' => $transaction,
            'client' => $transaction->client,
            'shopName' => $transaction->shop->name ?? 'Havifin',
        ]);

        return $pdf->download("recu-{$transaction->ticket_number}.pdf");
    }
}
