import { base44, Client } from '@/api/base44Client';
import ClientCard from '@/components/cashier/ClientCard';
import ProcessModal from '@/components/cashier/ProcessModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppMain from '@/layouts/app-main';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle,
    Clock,
    PhoneCall,
    RefreshCw,
    Users,
    Volume2,
} from 'lucide-react';
import { useState } from 'react';

export default function Cashier() {
    const [selectedClient, setSelectedClient] = useState(null);
    const [processModalOpen, setProcessModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: waitingClients = [], isLoading: loadingWaiting } = useQuery({
        queryKey: ['clients', 'waiting'],
        queryFn: () =>
            base44.entities.Client.filter(
                { status: 'waiting' },
                'created_date',
            ),
        refetchInterval: 5000,
    });

    const { data: calledClients = [] } = useQuery({
        queryKey: ['clients', 'called'],
        queryFn: () =>
            base44.entities.Client.filter({ status: 'called' }, '-called_at'),
        refetchInterval: 5000,
    });

    const { data: todayCompleted = [] } = useQuery({
        queryKey: ['clients', 'completed'],
        queryFn: async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return base44.entities.Client.filter(
                { status: 'completed' },
                '-completed_at',
                50,
            );
        },
        refetchInterval: 10000,
    });

    const callMutation = useMutation({
        mutationFn: async (client) => {
            await base44.entities.Client.update(client.id, {
                status: 'called',
                called_at: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });

    const handleCall = (client: Client) => {
        callMutation.mutate(client);
    };

    const handleProcess = (client: Client) => {
        setSelectedClient(client);
        setProcessModalOpen(true);
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
    };

    return (
        <AppMain currentPageName="Cashier">
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
                    <div className="mx-auto flex max-w-7xl items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Interface Caissier
                            </h1>
                            <p className="text-sm text-slate-500">
                                Gestion des clients et transactions
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 rounded-full border border-[#ff55ba]/20 bg-[#ff55ba]/10 px-4 py-2 text-[#ff55ba]">
                                <Users className="h-4 w-4" />
                                <span className="font-semibold">
                                    {waitingClients.length} en attente
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleRefresh}
                                className="hover:border-[#1f61e4] hover:text-[#1f61e4]"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl p-6">
                    <Tabs defaultValue="waiting" className="space-y-6">
                        <TabsList className="inline-flex w-full rounded-xl border bg-white p-1 shadow-sm md:w-auto">
                            <TabsTrigger
                                value="waiting"
                                className="rounded-lg px-6 py-2 data-[state=active]:bg-[#ff55ba] data-[state=active]:text-white"
                            >
                                <Clock className="mr-2 h-4 w-4" />
                                En attente
                                <Badge className="ml-2 border-0 bg-white/20 text-white">
                                    {waitingClients.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="called"
                                className="rounded-lg px-6 py-2 data-[state=active]:bg-[#1f61e4] data-[state=active]:text-white"
                            >
                                <PhoneCall className="mr-2 h-4 w-4" />
                                Appelés
                                <Badge className="ml-2 border-0 bg-white/20 text-white">
                                    {calledClients.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="completed"
                                className="rounded-lg px-6 py-2 data-[state=active]:bg-[#00e2f6] data-[state=active]:text-white"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Traités
                                <Badge className="ml-2 border-0 bg-white/20 text-white">
                                    {todayCompleted.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="waiting">
                            {waitingClients.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                                    <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                                    <h3 className="text-lg font-semibold text-slate-600">
                                        Aucun client en attente
                                    </h3>
                                    <p className="text-slate-400">
                                        Les nouveaux clients apparaîtront ici
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <AnimatePresence>
                                        {waitingClients.map(
                                            (client: Client) => (
                                                <ClientCard
                                                    key={client.id}
                                                    client={client}
                                                    onCall={handleCall}
                                                    onProcess={handleProcess}
                                                    isProcessing={
                                                        callMutation.isPending
                                                    }
                                                />
                                            ),
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="called">
                            {calledClients.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                                    <Volume2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                                    <h3 className="text-lg font-semibold text-slate-600">
                                        Aucun client appelé
                                    </h3>
                                    <p className="text-slate-400">
                                        Appelez un client depuis la liste
                                        d'attente
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <AnimatePresence>
                                        {calledClients.map((client: Client) => (
                                            <ClientCard
                                                key={client.id}
                                                client={client}
                                                onProcess={handleProcess}
                                                onCall={handleCall}
                                                isProcessing={false}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="completed">
                            {todayCompleted.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                                    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                                    <h3 className="text-lg font-semibold text-slate-600">
                                        Aucune transaction aujourd'hui
                                    </h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {todayCompleted.map((client: Client) => (
                                        <motion.div
                                            key={client.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-xl font-bold text-[#00e2f6]">
                                                    {client.ticket_number}
                                                </span>
                                                <Badge className="border-[#00e2f6]/20 bg-[#00e2f6]/10 text-[#00e2f6]">
                                                    Terminé
                                                </Badge>
                                            </div>
                                            <div className="font-medium text-slate-800">
                                                {client.phone}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                {client.phone}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <ProcessModal
                    client={selectedClient}
                    open={processModalOpen}
                    onClose={() => {
                        setProcessModalOpen(false);
                        setSelectedClient(null);
                    }}
                />
            </div>
        </AppMain>
    );
}
