import { base44 } from '@/api/base44Client';
import ActivityLog from '@/components/manager/ActivityLog';
import { CashMovementsTable } from '@/components/manager/CashMovementsTable';
import { ClientsTable } from '@/components/manager/ClientsTable';
import InstitutionManager from '@/components/manager/InstitutionManager';
import { ManualCashMovementDialog } from '@/components/manager/ManualCashMovementDialog';
import BccRatesBoard from '@/components/manager/BccRatesBoard';
import RatesManager from '@/components/manager/RatesManager';
import SessionManager from '@/components/manager/SessionManager';
import { StatsCard } from '@/components/manager/StatsCard';
import { TransactionsTable } from '@/components/manager/TransactionsTable';
import { UserManagement } from '@/components/manager/UserManagement';
import { Button } from '@/components/ui/button';
import AppMain from '@/layouts/app-main';
import { cn } from '@/lib/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Activity,
    ArrowRightLeft,
    Banknote,
    ChevronRight,
    Download,
    Landmark,
    LayoutDashboard,
    Menu,
    PieChart,
    Play,
    RefreshCw,
    Search,
    Settings,
    Store,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function Manager() {
    const { auth } = usePage().props as any;
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDate, setSelectedDate] = useState(
        moment().format('YYYY-MM-DD'),
    );
    const [clientSearch, setClientSearch] = useState('');
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
    const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

    // Fetch shops for super-admin/manager
    const { data: shops = [] } = useQuery({
        queryKey: ['manager-shops'],
        queryFn: () => base44.entities.Shop.list(),
    });

    useEffect(() => {
        if (shops.length > 0 && !selectedShopId) {
            setSelectedShopId(shops[0].id);
        }
    }, [shops, selectedShopId]);

    // Data Fetching
    const { data: clients = [], isLoading: loadingClients } = useQuery({
        queryKey: ['all-clients', selectedDate, clientSearch, selectedShopId],
        queryFn: () =>
            base44.entities.Client.list({
                sort: '-created_at',
                limit: 500,
                date: activeTab === 'clients' ? undefined : selectedDate,
                search: clientSearch,
                shop_id: selectedShopId || undefined,
            }),
        refetchInterval: 30000,
        enabled: !!selectedShopId,
    });

    const { data: transactions = [], isLoading: loadingTx } = useQuery({
        queryKey: ['all-transactions', selectedDate, selectedShopId],
        queryFn: () =>
            base44.entities.Transaction.list({
                sort: '-created_at',
                limit: 500,
                date: selectedDate,
                shop_id: selectedShopId || undefined,
            }),
        refetchInterval: 30000,
        enabled: !!selectedShopId,
    });

    const { data: cashMovements = [], isLoading: loadingMovements } = useQuery({
        queryKey: ['all-cash-movements', selectedDate, selectedShopId],
        queryFn: () =>
            base44.entities.CashSession.listMovements({
                date: selectedDate,
                shop_id: selectedShopId || undefined,
            }),
        refetchInterval: 30000,
        enabled: !!selectedShopId,
    });

    // Stats Logic
    const stats = useMemo(() => {
        const targetDate = moment(selectedDate).startOf('day');
        const isCurrentDay = targetDate.isSame(moment().startOf('day'));

        // Since the backend now filters by date, these lists already contain data for the target date
        const dayClients = clients;
        const dayTx = transactions;

        const volumeUSD = dayTx
            .filter((t) => t.currency_from === 'USD')
            .reduce((sum, t) => sum + (t.amount_from || 0), 0);

        const volumeCDF = dayTx
            .filter((t) => t.currency_from === 'CDF')
            .reduce((sum, t) => sum + (t.amount_from || 0), 0);

        const totalCommissions = dayTx.reduce(
            (sum, t) => sum + (parseFloat(t.commission as any) || 0),
            0,
        );

        return {
            todayClients: dayClients.length,
            waiting: dayClients.filter((c) => c.status === 'waiting').length,
            volumeUSD,
            volumeCDF,
            commissions: totalCommissions,
            isCurrentDay,
        };
    }, [clients, transactions, selectedDate]);

    // Deduplicate clients by phone number as requested
    const uniqueClients = useMemo(() => {
        const map = new Map();
        clients.forEach((c) => {
            const key = c.phone;
            if (!key) return; // Skip clients without phone

            if (!map.has(key)) {
                map.set(key, c);
            } else {
                const existing = map.get(key);
                // Prioritize registered clients
                if (c.is_registered && !existing.is_registered) {
                    map.set(key, c);
                }
            }
        });
        return Array.from(map.values());
    }, [clients]);

    const filteredTransactions = useMemo(() => {
        const search = transactionSearch.trim().toLowerCase();
        if (!search) return transactions;

        return transactions.filter((transaction) =>
            [
                transaction.ticket_number,
                transaction.client_phone,
                transaction.service,
                transaction.operation_type,
            ].some((value) => value?.toLowerCase().includes(search)),
        );
    }, [transactions, transactionSearch]);

    const overviewBreakdowns = useMemo(() => {
        const aggregate = (field: 'operation_type' | 'service') => {
            const counts = new Map<string, number>();
            transactions.forEach((transaction) => {
                const label = transaction[field] || 'Non défini';
                counts.set(label, (counts.get(label) || 0) + 1);
            });

            return Array.from(counts.entries())
                .map(([label, count]) => ({ label, count }))
                .sort((left, right) => right.count - left.count)
                .slice(0, 5);
        };

        return {
            operations: aggregate('operation_type'),
            services: aggregate('service'),
        };
    }, [transactions]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['all-clients'] });
        queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['all-cash-movements'] });
        setLastSync(new Date());
        toast.success('Tableau de bord actualisé');
    };

    const handleExport = () => {
        const protectCsvValue = (value: unknown) => {
            const text = String(value ?? '');
            const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;

            return `"${safeText.replaceAll('"', '""')}"`;
        };
        const rows = [
            [
                'Ticket',
                'Date',
                'Opération',
                'Service',
                'Devise source',
                'Montant source',
                'Devise cible',
                'Montant cible',
                'Commission',
            ],
            ...transactions.map((transaction) => [
                transaction.ticket_number,
                transaction.created_date,
                transaction.operation_type,
                transaction.service,
                transaction.currency_from,
                transaction.amount_from,
                transaction.currency_to,
                transaction.amount_to,
                transaction.commission,
            ]),
        ];
        const csv = rows
            .map((row) => row.map(protectCsvValue).join(','))
            .join('\n');
        const url = URL.createObjectURL(
            new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport-havifin-${selectedDate}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AppMain currentPageName="Manager">
            <Head title="Manager" />
            <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc]">
                {/* Manager Header (fixed) */}
                <header className="z-20 flex py-2 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2">
                        {/* Below lg the sidebar becomes a drawer, so it needs
                            a trigger; sits left of the logo as requested. */}
                        <button
                            type="button"
                            onClick={() => setIsNavOpen(true)}
                            aria-label="Ouvrir la navigation"
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-500 hover:text-indigo-600 lg:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative flex size-17 flex-shrink-0 items-center justify-center"
                        >
                            <img
                                src="/havifin-icon.png"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </motion.div>
                        <div className="mr-1 h-8 w-[1px] bg-slate-100" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap text-slate-900 uppercase">
                                    Console{' '}
                                    <span className="text-indigo-600">
                                        Manager
                                    </span>
                                </h1>
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold tracking-widest whitespace-nowrap text-emerald-600 uppercase">
                                    Live
                                </span>
                            </div>
                            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] whitespace-nowrap text-slate-400 uppercase">
                                {auth.user.role} •{' '}
                                {auth.user.shop || 'Boutique'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {shops.length > 0 && (
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition-all hover:border-indigo-500 hover:bg-white sm:pr-5">
                                <div className="flex size-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
                                    <Store className="h-4 w-4 text-slate-500" />
                                </div>
                                <select
                                    className="cursor-pointer border-none bg-transparent pr-10 text-sm font-semibold text-slate-700 uppercase focus:ring-0"
                                    value={selectedShopId || ''}
                                    onChange={(e) =>
                                        setSelectedShopId(
                                            Number(e.target.value),
                                        )
                                    }
                                >
                                    {shops.map((shop: any) => (
                                        <option key={shop.id} value={shop.id}>
                                            {shop.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {/* Doubles as the refresh control: a separate button
                            next to a passive "last sync" card was redundant. */}
                        <button
                            type="button"
                            onClick={handleRefresh}
                            title="Actualiser le tableau de bord"
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition-all hover:border-indigo-500 hover:bg-white sm:pr-5"
                        >
                            <div className="flex size-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
                                <RefreshCw
                                    className={cn(
                                        'size-4',
                                        (loadingClients || loadingTx) &&
                                            'animate-spin',
                                    )}
                                />
                            </div>
                            <div className="hidden text-left sm:block">
                                <div className="text-[10px] font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase">
                                    Dernier Sync
                                </div>
                                <div className="text-xs font-bold whitespace-nowrap text-slate-600">
                                    {lastSync
                                        ? moment(lastSync).format('HH:mm')
                                        : 'Actualiser'}
                                </div>
                            </div>
                        </button>

                        <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all focus-within:border-indigo-500">
                            <Search className="size-4 text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) =>
                                    setSelectedDate(e.target.value)
                                }
                                className="border-none bg-transparent text-xs font-bold tracking-widest text-slate-600 uppercase focus:ring-0"
                            />
                        </div>

                        <Button
                            onClick={handleExport}
                            disabled={transactions.length === 0}
                            className="h-12 rounded-2xl bg-slate-900 px-6 text-xs font-bold tracking-widest text-white uppercase shadow-xl shadow-slate-900/10 transition-all hover:bg-black active:scale-95"
                        >
                            <Download className="mr-2 h-4 w-4 text-emerald-400" />
                            Exporter Rapport
                        </Button>
                    </div>
                </header>

                {/* Body: fixed navigation sidebar + scrollable content */}
                <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                    {/* Navigation Sidebar (fixed, does not scroll with cards) */}
                    {/* Backdrop, drawer only */}
                    {isNavOpen && (
                        <div
                            onClick={() => setIsNavOpen(false)}
                            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                        />
                    )}

                    <aside
                        className={cn(
                            'shrink-0 space-y-4 overflow-y-auto p-4',
                            // Drawer under lg: slides in from the left and
                            // back out the same way when dismissed.
                            'fixed inset-y-0 left-0 z-50 w-[300px] bg-slate-50 shadow-2xl transition-transform duration-300 ease-out',
                            isNavOpen ? 'translate-x-0' : '-translate-x-full',
                            // Back to a static column on large screens.
                            'lg:static lg:z-auto lg:h-full lg:w-[280px] lg:translate-x-0 lg:bg-transparent lg:shadow-none lg:transition-none',
                        )}
                    >
                        <div className="flex items-center justify-end lg:hidden">
                            <button
                                type="button"
                                onClick={() => setIsNavOpen(false)}
                                aria-label="Fermer la navigation"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="rounded-[2rem] bg-white/50 p-5 shadow-sm backdrop-blur-xl">
                            <h3 className="mb-4 px-2 text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                                Navigation
                            </h3>
                            <nav className="space-y-2">
                                {[
                                    {
                                        id: 'overview',
                                        label: "Vue d'ensemble",
                                        icon: LayoutDashboard,
                                    },
                                    {
                                        id: 'transactions',
                                        label: 'Flux Transactions',
                                        icon: ArrowRightLeft,
                                    },
                                    {
                                        id: 'movements',
                                        label: 'Mouvements Manuels',
                                        icon: Banknote,
                                    },
                                    {
                                        id: 'rates',
                                        label: 'Gestion Taux',
                                        icon: Settings,
                                    },
                                    {
                                        id: 'users',
                                        label: 'Utilisateurs',
                                        icon: Users,
                                    },
                                    {
                                        id: 'clients',
                                        label: 'Base Clients',
                                        icon: Users,
                                    },
                                    {
                                        id: 'institutions',
                                        label: 'Banques & Partenaires',
                                        icon: Landmark,
                                    },
                                    {
                                        id: 'logs',
                                        label: 'Journal Activité',
                                        icon: Activity,
                                    },
                                    {
                                        id: 'sessions',
                                        label: 'Gestion Sessions',
                                        icon: Play,
                                    },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id);
                                                setIsNavOpen(false);
                                            }}
                                            className={cn(
                                                'flex w-full items-center justify-between rounded-2xl p-3 text-left text-sm font-semibold transition-all duration-300',
                                                'hover:bg-slate-500/10 hover:text-slate-500',
                                                activeTab === item.id
                                                    && 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-800 hover:text-white'
                                            )}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <Icon
                                                    className={cn(
                                                        'h-5 w-5 flex-shrink-0',
                                                        activeTab === item.id
                                                            ? 'text-white'
                                                            : 'text-slate-400',
                                                    )}
                                                />
                                                <span className="text-left whitespace-nowrap">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <ChevronRight
                                                className={cn(
                                                    'h-4 w-4 transition-transform',
                                                    activeTab === item.id
                                                        ? 'translate-x-1'
                                                        : 'opacity-0',
                                                )}
                                            />
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="group relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 text-white shadow-xl">
                            <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 bg-indigo-500/20 blur-[80px]" />
                            <h4 className="relative z-10 mb-2 text-xl font-bold">
                                Besoin d'aide ?
                            </h4>
                            <p className="relative z-10 mb-6 text-xs font-medium text-slate-400">
                                Consultez la documentation technique du bureau
                                de change.
                            </p>
                            <Button
                                asChild
                                className="relative z-10 w-full rounded-xl bg-white text-[10px] font-black tracking-widest text-slate-900 uppercase hover:bg-slate-100"
                            >
                                <Link href="/manager/guide">
                                    Guide Manager
                                </Link>
                            </Button>
                        </div>
                    </aside>

                    {/* Scrollable Content Body (KPI cards + tab content) */}
                    <main className="flex-1 overflow-y-auto bg-[url('/grid.svg')] bg-[length:40px_40px] px-10 py-10">
                        <div className="w-full max-w-none space-y-10">
                            {/* KPI Cards Section */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                                <StatsCard
                                    title="Clients Aujourd'hui"
                                    value={stats.todayClients}
                                    subtitle={`${stats.waiting} en attente`}
                                    icon={Users}
                                    color="blue"
                                />
                                <StatsCard
                                    title="Volume USD"
                                    value={`$ ${stats.volumeUSD.toLocaleString()}`}
                                    icon={TrendingUp}
                                    color="emerald"
                                />
                                <StatsCard
                                    title="Volume CDF"
                                    value={`${stats.volumeCDF.toLocaleString()} FC`}
                                    icon={Landmark}
                                    color="amber"
                                />
                                <StatsCard
                                    title="Commissions Estimées"
                                    value={`$ ${stats.commissions.toLocaleString()}`}
                                    icon={PieChart}
                                    color="indigo"
                                />
                            </div>

                            {/* Content Display */}
                            <div className="min-h-[600px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
                                <div className="p-5 sm:p-10">
                                    {activeTab === 'overview' && (
                                        <div className="animate-in space-y-8 duration-500 fade-in slide-in-from-bottom-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                                                        Performances du{' '}
                                                        {moment(
                                                            selectedDate,
                                                        ).format('DD/MM/YYYY')}
                                                    </h3>
                                                    <p className="text-sm font-medium text-slate-400">
                                                        Aperçu des flux
                                                        financiers et des
                                                        clients.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-7">
                                                    <h4 className="mb-6 text-sm font-bold tracking-wider text-slate-700 uppercase">
                                                        Répartition des
                                                        opérations
                                                    </h4>
                                                    <BreakdownList
                                                        items={
                                                            overviewBreakdowns.operations
                                                        }
                                                        color="bg-indigo-500"
                                                    />
                                                </div>
                                                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-7">
                                                    <h4 className="mb-6 text-sm font-bold tracking-wider text-slate-700 uppercase">
                                                        Activité par partenaire
                                                    </h4>
                                                    <BreakdownList
                                                        items={
                                                            overviewBreakdowns.services
                                                        }
                                                        color="bg-emerald-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <div className="mb-6 flex items-center justify-between">
                                                    <h4 className="text-lg font-bold tracking-tight text-slate-800">
                                                        Activités Récentes
                                                    </h4>
                                                    <Button
                                                        variant="ghost"
                                                        className="font-bold text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() =>
                                                            setActiveTab(
                                                                'transactions',
                                                            )
                                                        }
                                                    >
                                                        Voir tout
                                                    </Button>
                                                </div>
                                                <TransactionsTable
                                                    transactions={transactions.slice(
                                                        0,
                                                        5,
                                                    )}
                                                />
                                            </div>

                                            <div className="border-t border-slate-100 pt-8">
                                                <div className="mb-6 flex items-center justify-between">
                                                    <h4 className="text-lg font-bold tracking-tight text-slate-800">
                                                        Mouvements de Caisse
                                                        Récents
                                                    </h4>
                                                    <Button
                                                        variant="ghost"
                                                        className="font-bold text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() =>
                                                            setActiveTab(
                                                                'movements',
                                                            )
                                                        }
                                                    >
                                                        Voir tout
                                                    </Button>
                                                </div>
                                                <CashMovementsTable
                                                    movements={cashMovements.slice(
                                                        0,
                                                        5,
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'transactions' && (
                                        <div className="animate-in space-y-6 duration-300 fade-in">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                                                    Journal Complet
                                                </h3>
                                                <div className="relative w-72">
                                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        placeholder="Filtrer..."
                                                        className="h-10 w-full rounded-xl border-slate-200 pr-4 pl-10 text-sm focus:ring-indigo-500"
                                                        value={
                                                            transactionSearch
                                                        }
                                                        onChange={(event) =>
                                                            setTransactionSearch(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <TransactionsTable
                                                transactions={
                                                    filteredTransactions
                                                }
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'movements' && (
                                        <div className="animate-in space-y-6 duration-300 fade-in">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                                                    Mouvements Manuels
                                                    (Ajustements)
                                                </h3>
                                                <Button
                                                    onClick={() =>
                                                        setIsMovementDialogOpen(
                                                            true,
                                                        )
                                                    }
                                                    disabled={!selectedShopId}
                                                >
                                                    <Banknote className="mr-2 h-4 w-4" />
                                                    Nouvelle entrée ou sortie
                                                </Button>
                                            </div>
                                            <CashMovementsTable
                                                movements={cashMovements}
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'rates' && (
                                        <div className="animate-in space-y-6 duration-300 fade-in">
                                            <RatesManager />
                                            <BccRatesBoard />
                                        </div>
                                    )}

                                    {activeTab === 'institutions' && (
                                        <div className="animate-in duration-300 fade-in">
                                            <InstitutionManager />
                                        </div>
                                    )}

                                    {activeTab === 'users' && (
                                        <div className="animate-in duration-300 fade-in">
                                            <UserManagement />
                                        </div>
                                    )}

                                    {activeTab === 'clients' && (
                                        <div className="animate-in space-y-6 duration-300 fade-in">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="text-2xl font-bold tracking-tight text-slate-800">
                                                    Base de Données Clients
                                                </h3>
                                                <div className="relative w-72">
                                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        placeholder="Rechercher un client..."
                                                        className="h-10 w-full rounded-xl border-slate-200 pr-4 pl-10 text-sm focus:ring-indigo-500"
                                                        value={clientSearch}
                                                        onChange={(e) =>
                                                            setClientSearch(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <ClientsTable
                                                clients={uniqueClients}
                                                isLoading={
                                                    loadingClients ||
                                                    (shops.length > 0 &&
                                                        !selectedShopId)
                                                }
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'sessions' && (
                                        <div className="animate-in duration-300 fade-in">
                                            <SessionManager />
                                        </div>
                                    )}

                                    {activeTab === 'logs' && (
                                        <ActivityLog
                                            selectedDate={selectedDate}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
                <ManualCashMovementDialog
                    open={isMovementDialogOpen}
                    onOpenChange={setIsMovementDialogOpen}
                    shopId={selectedShopId}
                    selectedDate={selectedDate}
                />
            </div>
        </AppMain>
    );
}

function BreakdownList({
    items,
    color,
}: {
    items: Array<{ label: string; count: number }>;
    color: string;
}) {
    if (items.length === 0) {
        return (
            <div className="flex h-36 items-center justify-center text-xs font-bold text-slate-400">
                Aucune transaction pour cette date
            </div>
        );
    }

    const maximum = Math.max(...items.map((item) => item.count), 1);

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600 capitalize">
                            {item.label}
                        </span>
                        <span className="text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className={cn('h-full rounded-full', color)}
                            style={{
                                width: `${Math.max((item.count / maximum) * 100, 6)}%`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
