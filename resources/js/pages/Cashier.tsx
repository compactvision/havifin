import { base44, Client } from '@/api/base44Client';
import ClientCard from '@/components/cashier/ClientCard';
import HelpModal from '@/components/cashier/HelpModal';
import KanbanColumn from '@/components/cashier/KanbanColumn';
import ProcessModal from '@/components/cashier/ProcessModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppMain from '@/layouts/app-main';
import { cn } from '@/lib/utils';
import { Head, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock,
    PhoneCall,
    RefreshCw,
    Search,
    UserCircle,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function Cashier() {
    const { auth } = usePage().props as any;
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [processModalOpen, setProcessModalOpen] = useState(false);
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpClient, setHelpClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const queryClient = useQueryClient();

    // Data Fetching
    const { data: waitingClients = [] } = useQuery({
        queryKey: ['clients', 'waiting'],
        queryFn: () =>
            base44.entities.Client.filter(
                { status: 'waiting' },
                'created_date',
            ),
        refetchInterval: 5000,
    });

    const { data: calledClients = [] } = useQuery({
        queryKey: ['clients', 'called', auth.user.id],
        queryFn: () =>
            base44.entities.Client.filter(
                {
                    status: 'called',
                    cashier_id: auth.user.id.toString(),
                },
                '-called_at',
            ),
        refetchInterval: 5000,
    });

    const { data: completedClients = [] } = useQuery({
        queryKey: ['clients', 'completed'],
        queryFn: () =>
            base44.entities.Client.filter(
                { status: 'completed' },
                '-completed_at',
                20,
            ),
        refetchInterval: 10000,
    });

    // Filtered Data
    const filteredWaiting = useMemo(() => {
        return waitingClients.filter(
            (c) =>
                c.ticket_number
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery),
        );
    }, [waitingClients, searchQuery]);

    const filteredCalled = useMemo(() => {
        return calledClients.filter(
            (c) =>
                c.ticket_number
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery),
        );
    }, [calledClients, searchQuery]);

    const filteredCompleted = useMemo(() => {
        return completedClients.filter(
            (c) =>
                c.ticket_number
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                c.phone.includes(searchQuery),
        );
    }, [completedClients, searchQuery]);
    const callMutation = useMutation({
        mutationFn: async (client: Client) => {
            await base44.entities.Client.update(client.id, {
                status: 'called',
                called_at: new Date().toISOString(),
                counter_number: auth.user.counter_number || 1,
                cashier_id: auth.user.id.toString(),
            });
            return client;
        },
        onSuccess: (client) => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast.success(`Client ${client.ticket_number} appelé`);
        },
    });

    const recallMutation = useMutation({
        mutationFn: async (client: Client) => {
            // Re-update called_at to trigger announcement on Display
            await base44.entities.Client.update(client.id, {
                called_at: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            toast.info("Rappel envoyé à l'affichage");
        },
    });

    const handleCall = (client: Client) => callMutation.mutate(client);
    const handleRecall = (client: Client) => recallMutation.mutate(client);
    const handleProcess = (client: Client) => {
        setSelectedClient(client);
        setProcessModalOpen(true);
    };
    const handleHelp = (client: Client) => {
        setHelpClient(client);
        setHelpModalOpen(true);
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.info('Données actualisées');
    };

    return (
        <AppMain currentPageName="Tableau de Bord Caissier">
            <Head title="Tableau de Bord Caissier" />
            <div className="flex flex-col overflow-hidden bg-slate-50">
                {/* Dashboard Header */}
                <header className="z-20 flex h-20 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="relative flex h-16 w-36 items-center justify-center px-4"
                        >
                            <img
                                src="/logo-color.png"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </motion.div>
                        <div className="h-10 w-[1px] bg-slate-100" />
                        <div className="hidden md:block">
                            <h1 className="text-lg font-black tracking-tighter text-slate-800 uppercase">
                                Terminal{' '}
                                <span className="text-brand-blue">Caisse</span>
                            </h1>
                        </div>
                    </div>

                    <div className="mx-10 max-w-sm flex-1">
                        <div className="group relative">
                            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-blue" />
                            <Input
                                placeholder="Rechercher ticket..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 w-full rounded-2xl border-transparent bg-slate-50 pl-11 font-medium text-slate-700 transition-all focus:border-blue-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            className="h-12 rounded-2xl border-slate-200 bg-white px-6 font-bold shadow-sm transition-all hover:border-brand-blue hover:text-brand-blue"
                        >
                            <RefreshCw
                                className={cn(
                                    'mr-2 h-4 w-4',
                                    callMutation.isPending && 'animate-spin',
                                )}
                            />
                            Actualiser
                        </Button>

                        <div className="h-10 w-[1px] bg-slate-200" />

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-1.5 pr-4 shadow-inner">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm">
                                <UserCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                                    {auth.user.role}{' '}
                                    {auth.user.shop
                                        ? `• ${auth.user.shop}`
                                        : ''}
                                </div>
                                <div className="text-xs font-bold text-slate-700">
                                    {auth.user.name}
                                </div>
                            </div>
                        </div>

                        {auth.user.counter && (
                            <div className="flex items-center gap-2 rounded-2xl border border-brand-blue/20 bg-brand-blue/10 px-4 py-2 font-bold text-brand-blue">
                                <span className="text-[10px] tracking-widest uppercase">
                                    Guichet
                                </span>
                                <span className="text-sm">
                                    {auth.user.counter}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Kanban Board Container */}
                <main className="flex-1 overflow-x-auto overflow-y-hidden bg-[url('/grid.svg')] bg-[length:40px_40px] bg-fixed px-10 py-8">
                    <div className="flex h-full min-w-max gap-10 pb-4">
                        {/* Column: Waiting */}
                        <KanbanColumn
                            title="Clients en Attente"
                            icon={Clock}
                            count={waitingClients.length}
                            color="bg-slate-900 text-white border-slate-900"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredWaiting.map((client) => (
                                    <ClientCard
                                        key={client.id}
                                        client={client}
                                        onCall={handleCall}
                                        isProcessing={
                                            callMutation.isPending &&
                                            callMutation.variables?.id ===
                                                client.id
                                        }
                                    />
                                ))}
                            </AnimatePresence>
                            {waitingClients.length === 0 && (
                                <div className="mt-12 text-center opacity-30">
                                    <Users className="mx-auto mb-4 h-16 w-16" />
                                    <p className="text-sm font-bold tracking-widest uppercase">
                                        Aucun client
                                    </p>
                                </div>
                            )}
                        </KanbanColumn>

                        {/* Column: In Progress */}
                        <KanbanColumn
                            title="En Cours de Service"
                            icon={PhoneCall}
                            count={calledClients.length}
                            color="bg-brand-blue text-white border-brand-blue"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredCalled.map((client) => (
                                    <ClientCard
                                        key={client.id}
                                        client={client}
                                        onRecall={handleRecall}
                                        onProcess={handleProcess}
                                        onHelp={handleHelp}
                                    />
                                ))}
                            </AnimatePresence>
                            {calledClients.length === 0 && (
                                <div className="mt-12 text-center opacity-20">
                                    <PhoneCall className="mx-auto mb-4 h-16 w-16" />
                                    <p className="text-sm font-bold tracking-widest uppercase">
                                        Prenez un ticket
                                    </p>
                                </div>
                            )}
                        </KanbanColumn>

                        {/* Column: Completed */}
                        <KanbanColumn
                            title="Derniers Traités"
                            icon={CheckCircle2}
                            count={completedClients.length}
                            color="bg-brand-cyan text-brand-dark border-brand-cyan shadow-lg shadow-brand-cyan/20"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredCompleted.map((client) => (
                                    <ClientCard
                                        key={client.id}
                                        client={client}
                                    />
                                ))}
                            </AnimatePresence>
                        </KanbanColumn>
                    </div>
                </main>

                {/* Sub-modals */}
                <ProcessModal
                    client={selectedClient}
                    open={processModalOpen}
                    onClose={() => {
                        setProcessModalOpen(false);
                        setSelectedClient(null);
                        queryClient.invalidateQueries({
                            queryKey: ['clients'],
                        });
                    }}
                />

                <HelpModal
                    isOpen={helpModalOpen}
                    onClose={() => {
                        setHelpModalOpen(false);
                        setHelpClient(null);
                    }}
                    clientPhone={helpClient?.phone}
                />
            </div>
        </AppMain>
    );
}
