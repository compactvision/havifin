import { base44, Client, Transaction } from '@/api/base44Client';
import RatesManager from '@/components/manager/RatesManager';
import StatsCard from '@/components/manager/StatsCard';
import TransactionsTable from '@/components/manager/TransactionsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppMain from '@/layouts/app-main';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeftRight,
    Banknote,
    Settings,
    TrendingUp,
    Users,
} from 'lucide-react';

export default function Manager() {
    const { data: clients = [] } = useQuery({
        queryKey: ['all-clients'],
        // Fetch more clients to ensure accurate counts, or ideally use a dedicated stats endpoint
        queryFn: () => base44.entities.Client.list('-created_date', 500),
    });

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        // Fetch more transactions for accurate daily stats
        queryFn: () => base44.entities.Transaction.list('-created_date', 500),
    });

    // Helper for date comparison (YYYY-MM-DD)
    const isToday = (dateString: string) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const todayClients = clients.filter((c: Client) => isToday(c.created_date));
    const completedToday = todayClients.filter(
        (c: Client) => c.status === 'completed',
    );
    // Waiting count should be total waiting, not just from today
    const waitingCount = clients.filter(
        (c: Client) => c.status === 'waiting',
    ).length;

    const todayTransactions = transactions.filter((tx: Transaction) =>
        isToday(tx.created_date),
    );

    // Calculate volumes per currency
    const volumeByCurrency = todayTransactions.reduce(
        (acc: Record<string, number>, transaction: Transaction) => {
            const currency = transaction.currency_from;
            const amount = transaction.amount_from || 0;
            if (!acc[currency]) {
                acc[currency] = 0;
            }
            acc[currency] += amount;
            return acc;
        },
        {} as Record<string, number>,
    );

    const totalCommissions = todayTransactions.reduce(
        (sum: number, tx: any) => sum + (parseFloat(tx.commission) || 0),
        0,
    );

    return (
        <AppMain currentPageName="Manager">
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="border-b border-slate-200 bg-white px-6 py-6">
                    <div className="mx-auto max-w-7xl">
                        <h1 className="text-3xl font-bold text-slate-900">
                            Tableau de bord Manager
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Gestion et supervision du bureau de change
                        </p>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl p-6">
                    {/* Stats */}
                    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCard
                            title="Clients aujourd'hui"
                            value={todayClients.length}
                            subtitle={`${completedToday.length} traités`}
                            icon={Users}
                            color="blue"
                        />
                        <StatsCard
                            title="En attente"
                            value={waitingCount}
                            icon={Users}
                            color="amber"
                        />

                        {/* Display Volume for dominant currencies or combined string */}
                        <StatsCard
                            title="Volume USD / CDF"
                            value={
                                <div className="flex flex-col">
                                    <span className="text-xl">
                                        ${' '}
                                        {(
                                            volumeByCurrency['USD'] || 0
                                        ).toLocaleString()}
                                    </span>
                                    <span className="text-lg text-slate-500">
                                        FC{' '}
                                        {(
                                            volumeByCurrency['CDF'] || 0
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            }
                            icon={Banknote}
                            color="green"
                        />

                        <StatsCard
                            title="Commissions (Est.)"
                            value={`$${totalCommissions.toLocaleString()}`} // Assuming commission is base USD or mixed (this might need split too if multi-currency commissions are allowed)
                            icon={TrendingUp}
                            color="purple"
                        />
                    </div>

                    <Tabs defaultValue="transactions" className="space-y-6">
                        <TabsList className="inline-flex w-full rounded-xl border bg-white p-1 shadow-sm md:w-auto">
                            <TabsTrigger
                                value="transactions"
                                className="rounded-lg px-6 py-2 data-[state=active]:bg-[#1f61e4] data-[state=active]:text-white"
                            >
                                <ArrowLeftRight className="mr-2 h-4 w-4" />
                                Transactions
                            </TabsTrigger>
                            <TabsTrigger
                                value="rates"
                                className="rounded-lg px-6 py-2 data-[state=active]:bg-[#1f61e4] data-[state=active]:text-white"
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Taux de change
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="transactions">
                            <TransactionsTable transactions={transactions} />
                        </TabsContent>

                        <TabsContent value="rates">
                            <RatesManager />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppMain>
    );
}
