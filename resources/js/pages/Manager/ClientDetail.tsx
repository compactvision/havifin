import { base44 } from '@/api/base44Client';
import { StatsCard } from '@/components/manager/StatsCard';
import { TransactionsTable } from '@/components/manager/TransactionsTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AppMain from '@/layouts/app-main';
import { Head, Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    Calendar,
    Clock,
    CreditCard,
    Hash,
    Layers,
    Mail,
    MapPin,
    Phone,
    TrendingUp,
    User,
    Wallet,
} from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';

interface ClientDetailProps {
    id: string;
}

export default function ClientDetail({ id }: ClientDetailProps) {
    const clientId = parseInt(id);

    // Fetch client details
    const { data: client, isLoading: loadingClient } = useQuery({
        queryKey: ['client', clientId],
        queryFn: () => base44.entities.Client.show(clientId),
        enabled: !!clientId,
    });

    // Fetch client transactions
    const { data: transactions = [], isLoading: loadingTransactions } =
        useQuery({
            queryKey: ['client-transactions', clientId],
            queryFn: () =>
                base44.entities.Transaction.list({
                    client_id: clientId,
                    sort: '-created_at',
                }),
            enabled: !!clientId,
        });

    // Stats Logic
    const stats = useMemo(() => {
        const totalDeposits = transactions.filter(
            (t) => t.operation_type === 'depot',
        ).length;
        const totalWithdrawals = transactions.filter(
            (t) =>
                t.operation_type === 'retrait' ||
                t.operation_type === 'paiement',
        ).length;
        const totalExchanges = transactions.filter(
            (t) => t.operation_type === 'change',
        ).length;

        const totalVolumeUSD = transactions
            .filter((t) => t.currency_from === 'USD')
            .reduce((sum, t) => sum + (t.amount_from || 0), 0);

        const totalVolumeCDF = transactions
            .filter((t) => t.currency_from === 'CDF')
            .reduce((sum, t) => sum + (t.amount_from || 0), 0);

        return {
            count: transactions.length,
            deposits: totalDeposits,
            withdrawals: totalWithdrawals,
            exchanges: totalExchanges,
            volumeUSD: totalVolumeUSD,
            volumeCDF: totalVolumeCDF,
        };
    }, [transactions]);

    if (loadingClient && !client) {
        return (
            <AppMain currentPageName="Détails Client">
                <div className="space-y-8 p-10">
                    <Skeleton className="h-40 w-full rounded-[2.5rem]" />
                    <div className="grid grid-cols-4 gap-6">
                        <Skeleton className="h-32 rounded-3xl" />
                        <Skeleton className="h-32 rounded-3xl" />
                        <Skeleton className="h-32 rounded-3xl" />
                        <Skeleton className="h-32 rounded-3xl" />
                    </div>
                    <Skeleton className="h-96 rounded-[2.5rem]" />
                </div>
            </AppMain>
        );
    }

    if (!client) {
        return (
            <AppMain currentPageName="Détails Client">
                <div className="flex h-[60vh] flex-col items-center justify-center">
                    <User className="mb-4 h-16 w-16 text-slate-200" />
                    <h2 className="text-xl font-black text-slate-900">
                        Client introuvable
                    </h2>
                    <p className="mb-6 text-sm text-slate-500">
                        Ce client n'existe pas ou a été supprimé.
                    </p>
                    <Link href="/manager">
                        <Button className="rounded-xl">
                            Retour au tableau de bord
                        </Button>
                    </Link>
                </div>
            </AppMain>
        );
    }

    return (
        <AppMain currentPageName="Détails Client">
            <Head title={`Client - ${client.full_name || client.phone}`} />

            <div className="flex flex-col space-y-8 p-10">
                {/* Header Profile Card */}
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white bg-white/80 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
                    <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 bg-indigo-500/10 blur-[100px]" />

                    <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                        <div className="flex items-center gap-6">
                            <Link href="/manager">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-2xl bg-slate-100 transition-all hover:bg-slate-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                                </Button>
                            </Link>

                            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-900 shadow-2xl shadow-slate-900/20">
                                <User className="h-10 w-10 text-white" />
                            </div>

                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                    {client.full_name ||
                                        `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
                                        'Client Non Enregistré'}
                                </h1>
                                <div className="mt-2 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                        <Phone className="h-4 w-4 text-indigo-500" />
                                        {client.phone}
                                    </div>
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                            <Mail className="h-4 w-4 text-indigo-500" />
                                            {client.email}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                        <Calendar className="h-4 w-4 text-indigo-500" />
                                        Inscrit le{' '}
                                        {moment(client.created_date).format(
                                            'DD MMMM YYYY',
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <span
                                className={`rounded-full px-4 py-1.5 text-xs font-black tracking-widest uppercase ${
                                    client.is_registered
                                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                                        : 'border border-amber-100 bg-amber-50 text-amber-600'
                                }`}
                            >
                                {client.is_registered
                                    ? 'Statut: Confirmé'
                                    : 'Statut: Temporaire'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Opérations"
                        value={stats.count}
                        subtitle={`${stats.deposits} Dépôts • ${stats.withdrawals} Paiements`}
                        icon={Layers}
                        color="blue"
                    />
                    <StatsCard
                        title="Volume USD"
                        value={`$ ${stats.volumeUSD.toLocaleString()}`}
                        icon={Wallet}
                        color="emerald"
                    />
                    <StatsCard
                        title="Volume CDF"
                        value={`${stats.volumeCDF.toLocaleString()} FC`}
                        icon={TrendingUp}
                        color="amber"
                    />
                    <StatsCard
                        title="Taux Moyen"
                        value="Calcul..."
                        icon={CreditCard}
                        color="indigo"
                    />
                </div>

                {/* History Section */}
                <div className="overflow-hidden rounded-[2.5rem] border border-white bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
                    <div className="border-b border-slate-100 p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-slate-800">
                                    Historique Complet
                                </h3>
                                <p className="text-sm font-medium text-slate-400">
                                    Toutes les transactions effectuées par ce
                                    client.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                                    {transactions.length} Transactions
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {loadingTransactions ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton
                                        key={i}
                                        className="h-16 w-full rounded-2xl"
                                    />
                                ))}
                            </div>
                        ) : (
                            <TransactionsTable transactions={transactions} />
                        )}
                    </div>
                </div>

                {/* Additional Info Cards */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <div className="col-span-1 rounded-[2.5rem] border border-white bg-white/60 p-8 shadow-lg backdrop-blur-md">
                        <h4 className="mb-6 text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">
                            Information de Profil
                        </h4>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Adresse
                                    </p>
                                    <p className="font-bold text-slate-700">
                                        {client.address || 'Non spécifiée'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <Hash className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Numéro Ticket Récent
                                    </p>
                                    <p className="font-bold text-slate-700">
                                        #{client.ticket_number || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 rounded-[2.5rem] border border-white bg-slate-900 p-8 text-white shadow-2xl">
                        <div className="mb-8 flex items-center justify-between">
                            <h4 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                Analyse Rapide
                            </h4>
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-400 uppercase">
                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                Actif
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                    Opération Favorite
                                </p>
                                <div className="flex items-center gap-2">
                                    {stats.deposits >= stats.withdrawals &&
                                    stats.deposits >= stats.exchanges ? (
                                        <>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                                <ArrowDownLeft className="h-4 w-4" />
                                            </div>
                                            <span className="text-lg font-black italic">
                                                Dépôt
                                            </span>
                                        </>
                                    ) : stats.withdrawals >= stats.deposits &&
                                      stats.withdrawals >= stats.exchanges ? (
                                        <>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </div>
                                            <span className="text-lg font-black italic">
                                                Retrait
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                                                <CreditCard className="h-4 w-4" />
                                            </div>
                                            <span className="text-lg font-black italic">
                                                Change
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                    Fréquence
                                </p>
                                <p className="text-lg font-black italic">
                                    Régulière
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                    Dernière visite
                                </p>
                                <p className="text-lg font-black italic">
                                    {moment(
                                        transactions[0]?.created_date,
                                    ).fromNow()}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 h-[1px] w-full bg-white/10" />

                        <div className="mt-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                                    <Clock className="h-5 w-5 text-indigo-300" />
                                </div>
                                <p className="text-xs font-medium text-slate-400">
                                    Note: Ce client préfère les transactions en
                                    USD le matin.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppMain>
    );
}
