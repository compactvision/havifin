<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Reçu d'opération</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background-color:#1f61e4;padding:28px 32px;">
                            <span style="color:#ffffff;font-size:20px;font-weight:bold;">{{ $shopName }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 8px;font-size:16px;">
                                Bonjour {{ $client?->first_name ?? 'cher client' }},
                            </p>
                            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                                Votre opération a été traitée avec succès. Voici le récapitulatif :
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;margin-bottom:24px;">
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:6px 0;font-size:13px;color:#64748b;">Ticket</td>
                                                <td style="padding:6px 0;font-size:13px;font-weight:bold;text-align:right;">#{{ $transaction->ticket_number }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0;font-size:13px;color:#64748b;">Opération</td>
                                                <td style="padding:6px 0;font-size:13px;font-weight:bold;text-align:right;text-transform:capitalize;">{{ $transaction->operation_type }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0;font-size:13px;color:#64748b;">Service</td>
                                                <td style="padding:6px 0;font-size:13px;font-weight:bold;text-align:right;">{{ $transaction->service }}</td>
                                            </tr>
                                            @if ($transaction->amount_from)
                                            <tr>
                                                <td style="padding:6px 0;font-size:13px;color:#64748b;">Montant</td>
                                                <td style="padding:6px 0;font-size:13px;font-weight:bold;text-align:right;">
                                                    {{ number_format((float) $transaction->amount_from, 2) }} {{ $transaction->currency_from }}
                                                </td>
                                            </tr>
                                            @endif
                                            @if ($transaction->amount_to && $transaction->currency_to && $transaction->currency_to !== $transaction->currency_from)
                                            <tr>
                                                <td style="padding:6px 0;font-size:13px;color:#64748b;">Reçu</td>
                                                <td style="padding:6px 0;font-size:13px;font-weight:bold;text-align:right;">
                                                    {{ number_format((float) $transaction->amount_to, 2) }} {{ $transaction->currency_to }}
                                                </td>
                                            </tr>
                                            @endif
                                            <tr>
                                                <td style="padding:6px 0;font-size:13px;color:#64748b;">Date</td>
                                                <td style="padding:6px 0;font-size:13px;font-weight:bold;text-align:right;">
                                                    {{ $transaction->created_at?->format('d/m/Y à H:i') }}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">
                                Merci de votre confiance. À la prochaine chez {{ $shopName }} !
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px;background-color:#f8fafc;text-align:center;">
                            <span style="font-size:11px;color:#94a3b8;">Ce message est généré automatiquement, merci de ne pas y répondre.</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
