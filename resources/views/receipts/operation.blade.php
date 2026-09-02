<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Reçu #{{ $transaction->ticket_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 13px; }
        .header { background-color: #1f61e4; color: #fff; padding: 18px 24px; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 18px; }
        .box { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 6px 0; }
        .label { color: #64748b; }
        .value { text-align: right; font-weight: bold; }
        .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $shopName }}</h1>
        <span>Reçu d'opération</span>
    </div>
    <div class="box">
        <table>
            <tr>
                <td class="label">Ticket</td>
                <td class="value">#{{ $transaction->ticket_number }}</td>
            </tr>
            <tr>
                <td class="label">Client</td>
                <td class="value">{{ trim(($client?->first_name ?? '').' '.($client?->last_name ?? '')) ?: 'Client anonyme' }}</td>
            </tr>
            <tr>
                <td class="label">Téléphone</td>
                <td class="value">{{ $transaction->client_phone }}</td>
            </tr>
            <tr>
                <td class="label">Opération</td>
                <td class="value" style="text-transform: capitalize;">{{ $transaction->operation_type }}</td>
            </tr>
            <tr>
                <td class="label">Service</td>
                <td class="value">{{ $transaction->service }}</td>
            </tr>
            @if ($transaction->amount_from)
            <tr>
                <td class="label">Montant</td>
                <td class="value">{{ number_format((float) $transaction->amount_from, 2) }} {{ $transaction->currency_from }}</td>
            </tr>
            @endif
            @if ($transaction->amount_to && $transaction->currency_to && $transaction->currency_to !== $transaction->currency_from)
            <tr>
                <td class="label">Reçu</td>
                <td class="value">{{ number_format((float) $transaction->amount_to, 2) }} {{ $transaction->currency_to }}</td>
            </tr>
            @endif
            @if ($transaction->exchange_rate)
            <tr>
                <td class="label">Taux appliqué</td>
                <td class="value">{{ $transaction->exchange_rate }}</td>
            </tr>
            @endif
            @if ($transaction->commission)
            <tr>
                <td class="label">Commission</td>
                <td class="value">{{ number_format((float) $transaction->commission, 2) }}</td>
            </tr>
            @endif
            <tr>
                <td class="label">Date</td>
                <td class="value">{{ $transaction->created_at?->format('d/m/Y à H:i') }}</td>
            </tr>
        </table>
    </div>
    <div class="footer">Généré le {{ now()->format('d/m/Y à H:i') }} — {{ $shopName }}</div>
</body>
</html>
