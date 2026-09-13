import { base44, Transaction } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToXlsx } from '@/lib/xlsxExport';
import { useQuery } from '@tanstack/react-query';
import {
    BookOpen,
    Download,
    History,
    Landmark,
    Printer,
    TrendingUp,
} from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';

const numberFmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * SYSCOHADA is the accounting standard used across the OHADA zone (DRC
 * included). This maps each operation type to a default double-entry pair.
 * These account codes are a reasonable starting point, not a substitute for
 * validation by the shop's own accountant - the export says so up front.
 */
const SYSCOHADA_ACCOUNTS: Record<string, { debit: string; credit: string }> = {
    change: { debit: '571', credit: '571' }, // Caisse (devise reçue) / Caisse (devise donnée)
    depot: { debit: '571', credit: '4712' }, // Caisse / Comptes courants opérateurs (mobile money, banque)
    retrait: { debit: '4712', credit: '571' },
    paiement: { debit: '571', credit: '4712' },
};
const COMMISSION_ACCOUNT = '766'; // Gains de change / produits financiers

function currencyAccount(base: string, currency: string) {
    return `${base}.${currency}`;
}

export default function AdvancedReports() {
    const [activeReport, setActiveReport] = useState<
        'rates' | 'consolidated' | 'forecast' | 'accounting'
    >('rates');
    const [startDate, setStartDate] = useState(
        moment().subtract(30, 'days').format('YYYY-MM-DD'),
    );
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));

    const { data: transactions = [], isLoading: loadingTransactions } =
        useQuery({
            queryKey: ['audit-transactions', startDate, endDate],
            queryFn: () =>
                base44.entities.Transaction.list({
                    start_date: startDate,
                    end_date: endDate,
                    limit: 500,
                    sort: '-created_at',
                }),
            enabled:
                activeReport === 'rates' || activeReport === 'accounting',
        });

    const { data: overview, isLoading: loadingOverview } = useQuery({
        queryKey: ['consolidated-cash'],
        queryFn: () => base44.entities.ConsolidatedCash.overview(),
        enabled: activeReport === 'consolidated',
        refetchInterval: 30000,
    });

    const { data: forecast, isLoading: loadingForecast } = useQuery({
        queryKey: ['cash-forecast'],
        queryFn: () => base44.entities.ConsolidatedCash.forecast(),
        enabled: activeReport === 'forecast',
    });

    const rateTransactions = transactions.filter(
        (t) => t.operation_type === 'change',
    );

    const handlePrint = () => window.print();

    const handleExportRates = () => {
        exportToXlsx(`historique-taux-${startDate}-${endDate}`, [
            {
                name: 'Taux appliqués',
                columnWidths: [12, 18, 12, 14, 14, 14],
                rows: [
                    [
                        'Ticket',
                        'Date',
                        'Paire',
                        'Montant source',
                        'Montant cible',
                        'Taux appliqué',
                    ],
                    ...rateTransactions.map((t: Transaction) => [
                        t.ticket_number ?? '',
                        moment(t.created_date).format('DD/MM/YYYY HH:mm'),
                        `${t.currency_from}/${t.currency_to}`,
                        t.amount_from,
                        t.amount_to,
                        t.exchange_rate,
                    ]),
                ],
            },
        ]);
    };

    const handleExportConsolidated = () => {
        if (!overview) return;
        exportToXlsx('caisse-consolidee', [
            {
                name: 'Totaux devises',
                columnWidths: [12, 16],
                rows: [
                    ['Devise', 'Total (toutes boutiques)'],
                    ...Object.entries(overview.cash_totals).map(
                        ([currency, amount]) => [currency, amount],
                    ),
                ],
            },
            {
                name: 'Totaux opérateurs',
                columnWidths: [20, 12, 16],
                rows: [
                    ['Opérateur', 'Devise', 'Théorique (toutes boutiques)'],
                    ...overview.institution_totals.map((row) => [
                        row.institution,
                        row.currency,
                        row.theoretical,
                    ]),
                ],
            },
            {
                name: 'Sessions ouvertes',
                columnWidths: [16, 14, 16, 18],
                rows: [
                    ['Boutique', 'Guichet', 'Caissier', 'Ouverte depuis'],
                    ...overview.sessions.map((s) => [
                        s.shop ?? '',
                        s.counter ?? '',
                        s.cashier ?? '',
                        moment(s.opened_at).format('DD/MM/YYYY HH:mm'),
                    ]),
                ],
            },
        ]);
    };

    const handleExportAccounting = () => {
        const entries: (string | number)[][] = [];
        transactions.forEach((t: Transaction) => {
            const mapping = SYSCOHADA_ACCOUNTS[t.operation_type ?? ''];
            if (!mapping) return;
            const date = moment(t.created_date).format('DD/MM/YYYY');
            const label = `${t.operation_type?.toUpperCase()} #${t.ticket_number ?? t.id} - ${t.service ?? ''}`;

            if (t.operation_type === 'change') {
                entries.push([
                    date,
                    currencyAccount(mapping.debit, t.currency_to),
                    '',
                    label,
                    t.amount_to,
                    '',
                ]);
                entries.push([
                    date,
                    '',
                    currencyAccount(mapping.credit, t.currency_from),
                    label,
                    '',
                    t.amount_from,
                ]);
                if (t.commission) {
                    entries.push([
                        date,
                        '',
                        COMMISSION_ACCOUNT,
                        `Commission ${label}`,
                        '',
                        t.commission,
                    ]);
                }
            } else {
                entries.push([
                    date,
                    currencyAccount(mapping.debit, t.currency_from),
                    '',
                    label,
                    t.amount_from,
                    '',
                ]);
                entries.push([
                    date,
                    '',
                    currencyAccount(mapping.credit, t.currency_from),
                    label,
                    '',
                    t.amount_from,
                ]);
            }
        });

        exportToXlsx(`journal-comptable-${startDate}-${endDate}`, [
            {
                name: 'Journal SYSCOHADA',
                columnWidths: [12, 14, 14, 40, 14, 14],
                rows: [
                    [
                        'Date',
                        'Compte débit',
                        'Compte crédit',
                        'Libellé',
                        'Débit',
                        'Crédit',
                    ],
                    ...entries,
                ],
            },
        ]);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="mb-2 text-2xl font-bold tracking-tight text-slate-800">
                    Rapports Avancés
                </h3>
                <p className="text-sm font-medium text-slate-400">
                    Rapprochement, traçabilité des taux, prévisions et export
                    comptable.
                </p>
            </div>

            <Tabs
                value={activeReport}
                onValueChange={(v) => setActiveReport(v as typeof activeReport)}
            >
                <TabsList>
                    <TabsTrigger value="rates" className="gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Historique des Taux
                    </TabsTrigger>
                    <TabsTrigger value="consolidated" className="gap-1.5">
                        <Landmark className="h-3.5 w-3.5" />
                        Caisse Consolidée
                    </TabsTrigger>
                    <TabsTrigger value="forecast" className="gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Prévisions
                    </TabsTrigger>
                    <TabsTrigger value="accounting" className="gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        Export Comptable
                    </TabsTrigger>
                </TabsList>

                {/* Historique des Taux */}
                <TabsContent value="rates" className="mt-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold"
                            />
                            <span className="text-xs text-slate-400">à</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handlePrint}
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl"
                            >
                                <Printer className="mr-2 h-3.5 w-3.5" />
                                Imprimer
                            </Button>
                            <Button
                                onClick={handleExportRates}
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl"
                            >
                                <Download className="mr-2 h-3.5 w-3.5" />
                                Exporter XLSX
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Ticket</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Paire</th>
                                    <th className="px-4 py-3">
                                        Montant source
                                    </th>
                                    <th className="px-4 py-3">
                                        Montant cible
                                    </th>
                                    <th className="px-4 py-3">Taux</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingTransactions ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-slate-400"
                                        >
                                            Chargement...
                                        </td>
                                    </tr>
                                ) : rateTransactions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-slate-400"
                                        >
                                            Aucune opération de change sur
                                            cette période.
                                        </td>
                                    </tr>
                                ) : (
                                    rateTransactions.map((t: Transaction) => (
                                        <tr key={t.id}>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                {t.ticket_number}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {moment(
                                                    t.created_date,
                                                ).format('DD/MM/YYYY HH:mm')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline">
                                                    {t.currency_from}/
                                                    {t.currency_to}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">
                                                {numberFmt.format(
                                                    t.amount_from,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">
                                                {numberFmt.format(t.amount_to)}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-indigo-600">
                                                {numberFmt.format(
                                                    t.exchange_rate,
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* Caisse Consolidée */}
                <TabsContent value="consolidated" className="mt-6 space-y-6">
                    <div className="flex justify-end gap-2 print:hidden">
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl"
                        >
                            <Printer className="mr-2 h-3.5 w-3.5" />
                            Imprimer
                        </Button>
                        <Button
                            onClick={handleExportConsolidated}
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl"
                            disabled={!overview}
                        >
                            <Download className="mr-2 h-3.5 w-3.5" />
                            Exporter XLSX
                        </Button>
                    </div>

                    {loadingOverview ? (
                        <p className="py-10 text-center text-slate-400">
                            Chargement...
                        </p>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {Object.entries(
                                    overview?.cash_totals ?? {},
                                ).map(([currency, amount]) => (
                                    <Card
                                        key={currency}
                                        className="rounded-3xl border-slate-200/70"
                                    >
                                        <CardContent className="p-5">
                                            <p className="text-xs font-semibold text-slate-400 uppercase">
                                                Total Cash {currency}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold text-slate-900">
                                                {numberFmt.format(amount)}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Toutes boutiques confondues
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {(overview?.institution_totals.length ?? 0) >
                                0 && (
                                <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
                                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                        Flottants opérateurs (total)
                                    </div>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-slate-100">
                                            {overview!.institution_totals.map(
                                                (row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-5 py-3 font-semibold text-slate-700">
                                                            {row.institution}
                                                        </td>
                                                        <td className="px-5 py-3 text-slate-400">
                                                            {row.currency}
                                                        </td>
                                                        <td className="px-5 py-3 text-right font-bold text-slate-900">
                                                            {numberFmt.format(
                                                                row.theoretical,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
                                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    {overview?.open_sessions_count ?? 0}{' '}
                                    caisse(s) ouverte(s)
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50 text-left text-xs font-semibold text-slate-400 uppercase">
                                        <tr>
                                            <th className="px-5 py-2">
                                                Boutique
                                            </th>
                                            <th className="px-5 py-2">
                                                Guichet
                                            </th>
                                            <th className="px-5 py-2">
                                                Caissier
                                            </th>
                                            <th className="px-5 py-2">
                                                Ouverte depuis
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {overview?.sessions.map((s) => (
                                            <tr key={s.session_id}>
                                                <td className="px-5 py-3 font-semibold text-slate-700">
                                                    {s.shop}
                                                </td>
                                                <td className="px-5 py-3 text-slate-500">
                                                    {s.counter}
                                                </td>
                                                <td className="px-5 py-3 text-slate-500">
                                                    {s.cashier}
                                                </td>
                                                <td className="px-5 py-3 text-slate-400">
                                                    {moment(
                                                        s.opened_at,
                                                    ).format(
                                                        'DD/MM/YYYY HH:mm',
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Prévisions */}
                <TabsContent value="forecast" className="mt-6 space-y-4">
                    <p className="text-xs text-slate-400">
                        Fondé sur les {forecast?.based_on_days ?? 30} derniers
                        jours de mouvements de caisse - moyenne mobile, pas de
                        modèle prédictif.
                    </p>
                    {loadingForecast ? (
                        <p className="py-10 text-center text-slate-400">
                            Chargement...
                        </p>
                    ) : (forecast?.forecast.length ?? 0) === 0 ? (
                        <p className="py-10 text-center text-slate-400">
                            Pas assez d'historique de mouvements pour établir
                            une prévision.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {forecast?.forecast.map((row) => (
                                <Card
                                    key={row.currency}
                                    className="overflow-hidden rounded-3xl border-slate-200/70"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                                        <span className="font-semibold text-slate-700">
                                            {row.currency}
                                        </span>
                                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                            Fonds recommandé demain
                                        </Badge>
                                    </div>
                                    <CardContent className="p-6">
                                        <p className="mb-4 text-3xl font-bold text-slate-900">
                                            {numberFmt.format(
                                                row.recommended_opening_fund,
                                            )}
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                            {(['7d', '14d', '30d'] as const).map(
                                                (w) => (
                                                    <div
                                                        key={w}
                                                        className="rounded-2xl bg-slate-50 p-3"
                                                    >
                                                        <p className="font-semibold text-slate-400 uppercase">
                                                            {w}
                                                        </p>
                                                        <p className="mt-1 font-bold text-slate-800">
                                                            {numberFmt.format(
                                                                row.windows[w]
                                                                    .avg_net,
                                                            )}
                                                        </p>
                                                        <p className="text-slate-400">
                                                            net/jour
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Export Comptable */}
                <TabsContent value="accounting" className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Les comptes SYSCOHADA utilisés (571 Caisse, 4712
                        Comptes courants opérateurs, 766 Gains de change) sont
                        un point de départ standard - faites valider le plan
                        de comptes exact avec votre comptable avant de
                        l'utiliser pour le dépôt légal.
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold"
                            />
                            <span className="text-xs text-slate-400">à</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold"
                            />
                        </div>
                        <Button
                            onClick={handleExportAccounting}
                            disabled={transactions.length === 0}
                            className="h-10 rounded-xl bg-slate-900 text-white hover:bg-black"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Exporter le journal (XLSX)
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400">
                        {transactions.length} transaction(s) sur la période
                        sélectionnée.
                    </p>
                </TabsContent>
            </Tabs>
        </div>
    );
}
