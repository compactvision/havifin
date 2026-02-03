import { base44 } from '@/api/base44Client';
import ActivityLog from '@/components/manager/ActivityLog';
import { CashMovementsTable } from '@/components/manager/CashMovementsTable';
import { ClientsTable } from '@/components/manager/ClientsTable';
import InstitutionManager from '@/components/manager/InstitutionManager';
import RatesManager from '@/components/manager/RatesManager';
import SessionManager from '@/components/manager/SessionManager';
import ShopManager from '@/components/manager/ShopManager';
import { StatsCard } from '@/components/manager/StatsCard';
import { TransactionsTable } from '@/components/manager/TransactionsTable';
import { UserManagement } from '@/components/manager/UserManagement';
import { Button } from '@/components/ui/button';
import AppMain from '@/layouts/app-main';
import { cn } from '@/lib/utils';
import { Head, usePage } from '@inertiajs/react';
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
    PieChart,
    Play,
    RefreshCw,
    Search,
    Settings,
    Store,
    TrendingUp,
    Users,
} from 'lucide-react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function Manager() {
    const { auth } = usePage().props as any;
    const userRole = auth.user?.role;
    const isSuperAdmin = userRole === 'super-admin';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(
        isSuperAdmin ? 'shops' : 'overview',
    ); // overview, rates, users, shops
    const [selectedDate, setSelectedDate] = useState(
        moment().format('YYYY-MM-DD'),
    );
    const [clientSearch, setClientSearch] = useState('');

    // Data Fetching
    const { data: clients = [], isLoading: loadingClients } = useQuery({
        queryKey: ['all-clients', selectedDate, clientSearch],
        queryFn: () =>
            base44.entities.Client.list({
                sort: '-created_at',
                limit: 500,
                date: activeTab === 'clients' ? undefined : selectedDate,
                search: clientSearch,
            }),
        refetchInterval: 30000,
    });

    const { data: transactions = [], isLoading: loadingTx } = useQuery({
        queryKey: ['all-transactions', selectedDate],
        queryFn: () =>
            base44.entities.Transaction.list({
                sort: '-created_at',
                limit: 500,
                date: selectedDate,
            }),
        refetchInterval: 30000,
    });

    const { data: cashMovements = [], isLoading: loadingMovements } = useQuery({
        queryKey: ['all-cash-movements', selectedDate],
        queryFn: async () => {
            const response = await base44.entities.CashSession.listMovements({
                date: selectedDate,
            } as any);
            return (response as any).data || [];
        },
        refetchInterval: 30000,
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

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['all-clients'] });
        queryClient.invalidateQueries({ queryKey: ['all-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['all-cash-movements'] });
        toast.success('Tableau de bord actualisé');
    };

    return (
        <AppMain currentPageName="Manager">
            <Head title="Manager" />
            <div className="flex flex-col overflow-hidden bg-[#f8fafc]">
                {/* Manager Header */}
                <header className="z-20 flex h-24 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="relative flex h-16 w-38 items-center justify-center px-4"
                        >
                            <img
                                src="/logo-color.png"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </motion.div>
                        <div className="h-10 w-[1px] bg-slate-100" />
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                    Console{' '}
                                    <span className="text-indigo-600">
                                        Manager
                                    </span>
                                </h1>
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                                    Live
                                </span>
                            </div>
                            <p className="mt-1 flex items-center gap-2 text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
                                {auth.user.role} •{' '}
                                {auth.user.shop || 'Supervision & Reporting'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 pr-5 xl:flex">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
                                <RefreshCw
                                    className={cn(
                                        'h-5 w-5',
                                        (loadingClients || loadingTx) &&
                                            'animate-spin',
                                    )}
                                />
                            </div>
                            <div>
                                <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                                    Dernier Sync
                                </div>
                                <div className="text-xs font-bold text-slate-600">
                                    A l'instant
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            className="h-12 rounded-2xl border-slate-200 bg-white px-6 text-xs font-black tracking-widest uppercase shadow-sm transition-all hover:border-indigo-500 hover:text-indigo-600"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Actualiser
                        </Button>

                        <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all focus-within:border-indigo-500">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) =>
                                    setSelectedDate(e.target.value)
                                }
                                className="border-none bg-transparent text-xs font-black tracking-widest text-slate-600 uppercase focus:ring-0"
                            />
                        </div>

                        <Button className="h-12 rounded-2xl bg-slate-900 px-6 text-xs font-black tracking-widest text-white uppercase shadow-xl shadow-slate-900/10 transition-all hover:bg-black active:scale-95">
                            <Download className="mr-2 h-4 w-4 text-emerald-400" />
                            Exporter Rapport
                        </Button>
                    </div>
                </header>

                {/* Main Content Scrollable Area */}
                <main className="flex-1 overflow-y-auto bg-[url('/grid.svg')] bg-[length:40px_40px] px-10 py-10">
                    <div className="w-full max-w-none space-y-10">
                        {/* KPI Cards Section */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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

                        {/* Layout Board */}
                        <div className="grid grid-cols-12 gap-8">
                            {/* Navigation Sidebar */}
                            <div className="col-span-12 space-y-4 lg:col-span-3">
                                <div className="rounded-[2rem] border border-white bg-white/50 p-6 shadow-sm backdrop-blur-xl">
                                    <h3 className="mb-6 px-2 text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase">
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
                                            ...(isSuperAdmin
                                                ? [
                                                      {
                                                          id: 'shops',
                                                          label: 'Gestion Boutiques',
                                                          icon: Store,
                                                      },
                                                  ]
                                                : []),
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() =>
                                                        setActiveTab(item.id)
                                                    }
                                                    className={cn(
                                                        'flex w-full items-center justify-between rounded-2xl border p-4 text-sm font-bold transition-all duration-300',
                                                        activeTab === item.id
                                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                            : 'border-slate-100 bg-white/40 text-slate-500 hover:border-slate-200 hover:bg-white',
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon
                                                            className={cn(
                                                                'h-5 w-5',
                                                                activeTab ===
                                                                    item.id
                                                                    ? 'text-white'
                                                                    : 'text-slate-400',
                                                            )}
                                                        />
                                                        {item.label}
                                                    </div>
                                                    <ChevronRight
                                                        className={cn(
                                                            'h-4 w-4 transition-transform',
                                                            activeTab ===
                                                                item.id
                                                                ? 'translate-x-1'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                <div className="group relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
                                    <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 bg-indigo-500/20 blur-[80px]" />
                                    <h4 className="relative z-10 mb-2 text-xl font-black">
                                        Besoin d'aide ?
                                    </h4>
                                    <p className="relative z-10 mb-6 text-xs font-medium text-slate-400">
                                        Consultez la documentation technique du
                                        bureau de change.
                                    </p>
                                    <Button className="relative z-10 w-full rounded-xl bg-white text-[10px] font-black tracking-widest text-slate-900 uppercase hover:bg-slate-100">
                                        Guide Manager
                                    </Button>
                                </div>
                            </div>

                            {/* Content Display */}
                            <div className="col-span-12 lg:col-span-9">
                                <div className="min-h-[600px] overflow-hidden rounded-[2.5rem] border border-white bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
                                    <div className="p-10">
                                        {activeTab === 'overview' && (
                                            <div className="animate-in space-y-8 duration-500 fade-in slide-in-from-bottom-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-2xl font-black tracking-tight text-slate-800">
                                                            Performances du{' '}
                                                            {moment(
                                                                selectedDate,
                                                            ).format(
                                                                'DD/MM/YYYY',
                                                            )}
                                                        </h3>
                                                        <p className="text-sm font-medium text-slate-400">
                                                            Aperçu des flux
                                                            financiers et des
                                                            clients.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                    {/* Featured Table or Chart Placeholder */}
                                                    <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 p-8 opacity-50">
                                                        <PieChart className="mb-4 h-16 w-16 text-slate-300" />
                                                        <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                                                            Graphique des Flux
                                                            (Soon)
                                                        </p>
                                                    </div>
                                                    <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 p-8 opacity-50">
                                                        <LayoutDashboard className="mb-4 h-16 w-16 text-slate-300" />
                                                        <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                                                            Volume par Guichet
                                                            (Soon)
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="mb-6 flex items-center justify-between">
                                                        <h4 className="text-lg font-black tracking-tight text-slate-800">
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
                                                        <h4 className="text-lg font-black tracking-tight text-slate-800">
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
                                                    <h3 className="text-2xl font-black tracking-tight text-slate-800">
                                                        Journal Complet
                                                    </h3>
                                                    <div className="relative w-72">
                                                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            placeholder="Filtrer..."
                                                            className="h-10 w-full rounded-xl border-slate-200 pr-4 pl-10 text-sm focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                                <TransactionsTable
                                                    transactions={transactions}
                                                />
                                            </div>
                                        )}

                                        {activeTab === 'movements' && (
                                            <div className="animate-in space-y-6 duration-300 fade-in">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h3 className="text-2xl font-black tracking-tight text-slate-800">
                                                        Mouvements Manuels
                                                        (Ajustements)
                                                    </h3>
                                                </div>
                                                <CashMovementsTable
                                                    movements={cashMovements}
                                                />
                                            </div>
                                        )}

                                        {activeTab === 'rates' && (
                                            <div className="animate-in duration-300 fade-in">
                                                <RatesManager />
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

                                        {activeTab === 'shops' && (
                                            <div className="animate-in duration-300 fade-in">
                                                <ShopManager />
                                            </div>
                                        )}

                                        {activeTab === 'clients' && (
                                            <div className="animate-in space-y-6 duration-300 fade-in">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h3 className="text-2xl font-black tracking-tight text-slate-800">
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
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <ClientsTable
                                                    clients={uniqueClients}
                                                    isLoading={loadingClients}
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
                        </div>
                    </div>
                </main>
            </div>
        </AppMain>
    );
}
