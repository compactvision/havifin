import { base44, CashierRankingRow, ShopRankingRow } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Medal, Store, Users } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';

const numberFmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const EMPTY_CASHIER_RANKING: CashierRankingRow[] = [];
const EMPTY_SHOP_RANKING: ShopRankingRow[] = [];

const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];

function VolumeCell({ volume }: { volume: Record<string, number> }) {
    const entries = Object.entries(volume ?? {});
    if (entries.length === 0) {
        return <span className="text-muted-foreground">—</span>;
    }
    return (
        <div className="flex flex-col gap-0.5">
            {entries.map(([currency, amount]) => (
                <span key={currency}>
                    {numberFmt.format(amount)} {currency}
                </span>
            ))}
        </div>
    );
}

function DifferenceCell({ diff }: { diff: Record<string, number> }) {
    const entries = Object.entries(diff ?? {}).filter(
        ([, amount]) => Math.abs(amount) > 0.001,
    );
    if (entries.length === 0) {
        return <span className="text-muted-foreground">Aucun écart</span>;
    }
    return (
        <div className="flex flex-col gap-0.5">
            {entries.map(([currency, amount]) => (
                <span
                    key={currency}
                    className={amount < 0 ? 'text-red-600' : 'text-emerald-600'}
                >
                    {amount > 0 ? '+' : ''}
                    {numberFmt.format(amount)} {currency}
                </span>
            ))}
        </div>
    );
}

export default function LeaderboardReport() {
    const [activeTab, setActiveTab] = useState<'cashiers' | 'shops'>(
        'cashiers',
    );
    const [startDate, setStartDate] = useState(
        moment().subtract(6, 'days').format('YYYY-MM-DD'),
    );
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));

    const { data: cashierData, isLoading: loadingCashiers } = useQuery({
        queryKey: ['leaderboard-cashiers', startDate, endDate],
        queryFn: () =>
            base44.entities.Leaderboard.cashiers({
                start_date: startDate,
                end_date: endDate,
            }),
        enabled: activeTab === 'cashiers',
    });

    const { data: shopData, isLoading: loadingShops } = useQuery({
        queryKey: ['leaderboard-shops', startDate, endDate],
        queryFn: () =>
            base44.entities.Leaderboard.shops({
                start_date: startDate,
                end_date: endDate,
            }),
        enabled: activeTab === 'shops',
    });

    const cashierRanking = cashierData?.ranking ?? EMPTY_CASHIER_RANKING;
    const shopRanking = shopData?.ranking ?? EMPTY_SHOP_RANKING;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Classement caissiers &amp; boutiques
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Volume traité, tickets et écarts de caisse sur la
                        période sélectionnée.
                    </p>
                </div>
                <div className="flex items-end gap-2">
                    <div>
                        <label className="text-xs text-muted-foreground">
                            Du
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block rounded-md border px-2 py-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground">
                            Au
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block rounded-md border px-2 py-1 text-sm"
                        />
                    </div>
                </div>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'cashiers' | 'shops')}
            >
                <TabsList>
                    <TabsTrigger value="cashiers" className="gap-1">
                        <Users className="h-4 w-4" />
                        Caissiers
                    </TabsTrigger>
                    <TabsTrigger value="shops" className="gap-1">
                        <Store className="h-4 w-4" />
                        Boutiques
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cashiers">
                    <Card>
                        <CardContent className="overflow-x-auto p-0">
                            {loadingCashiers ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    Chargement...
                                </p>
                            ) : cashierRanking.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    Aucune transaction sur cette période.
                                </p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/50 text-left">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Caissier</th>
                                            <th className="p-3">Tickets</th>
                                            <th className="p-3">Volume</th>
                                            <th className="p-3">
                                                Opérations
                                            </th>
                                            <th className="p-3">
                                                Écarts de caisse
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashierRanking.map((row, index) => (
                                            <tr
                                                key={
                                                    row.cashier_id ??
                                                    row.cashier_email
                                                }
                                                className="border-b last:border-0"
                                            >
                                                <td className="p-3 font-medium">
                                                    {index < 3 ? (
                                                        <Medal
                                                            className={`h-4 w-4 ${MEDAL_COLORS[index]}`}
                                                        />
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div>{row.cashier_name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {row.cashier_email}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="secondary">
                                                        {row.tickets_treated}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <VolumeCell
                                                        volume={
                                                            row.volume_by_currency
                                                        }
                                                    />
                                                </td>
                                                <td className="p-3 text-xs text-muted-foreground">
                                                    {row.operations.depot} dépôts
                                                    · {row.operations.retrait}{' '}
                                                    retraits ·{' '}
                                                    {row.operations.change}{' '}
                                                    changes ·{' '}
                                                    {row.operations.paiement}{' '}
                                                    paiements
                                                </td>
                                                <td className="p-3">
                                                    <DifferenceCell
                                                        diff={
                                                            row.total_difference_by_currency
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="shops">
                    <Card>
                        <CardContent className="overflow-x-auto p-0">
                            {loadingShops ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    Chargement...
                                </p>
                            ) : shopRanking.length === 0 ? (
                                <p className="p-4 text-sm text-muted-foreground">
                                    Aucune boutique disponible.
                                </p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/50 text-left">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Boutique</th>
                                            <th className="p-3">Tickets</th>
                                            <th className="p-3">Volume</th>
                                            <th className="p-3">
                                                Caissiers actifs
                                            </th>
                                            <th className="p-3">
                                                Écarts de caisse
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shopRanking.map((row, index) => (
                                            <tr
                                                key={row.shop_id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="p-3 font-medium">
                                                    {index < 3 ? (
                                                        <Medal
                                                            className={`h-4 w-4 ${MEDAL_COLORS[index]}`}
                                                        />
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    {row.shop_name}
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="secondary">
                                                        {row.tickets_treated}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <VolumeCell
                                                        volume={
                                                            row.volume_by_currency
                                                        }
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    {row.active_cashiers}
                                                </td>
                                                <td className="p-3">
                                                    <DifferenceCell
                                                        diff={
                                                            row.total_difference_by_currency
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
