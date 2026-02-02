import CashRegisterCard from '@/components/cash/CashRegisterCard';
import OpenSessionModal from '@/components/cash/OpenSessionModal';
import { Button } from '@/components/ui/button';
import AppMain from '@/layouts/app-main';
import { CashRegister } from '@/types/cash';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CashDashboard() {
    const queryClient = useQueryClient();
    const { auth } = usePage().props as any;
    const { data: registers = [], isLoading } = useQuery<CashRegister[]>({
        queryKey: ['cash-registers'],
        queryFn: async () => {
            const { data } = await axios.get('/api/cash/registers');
            return data;
        },
    });

    const [isOpeningSession, setIsOpeningSession] = useState(false);
    const [selectedRegister, setSelectedRegister] =
        useState<CashRegister | null>(null);

    const handleOpenSession = (register: CashRegister) => {
        setSelectedRegister(register);
        setIsOpeningSession(true);
    };

    const handleSessionSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
    };

    const handleCreateDefaultRegister = async () => {
        try {
            toast.info('Initialisation de la caisse par défaut...');
            await axios.post('/api/cash/registers', {
                shop_id: auth.user.shop_id || 1, // Fallback to 1 if not set, or handle better
                name: 'Caisse Principale',
            });
            toast.success('Caisse configurée avec succès !');
            queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
        } catch (err) {
            console.error(err);
            toast.error('Erreur lors de la configuration.');
        }
    };

    return (
        <AppMain currentPageName="CashMoney">
            <Head title="Gestion de Caisse" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 px-6 py-8 md:px-10">
                {/* Premium Header */}
                <header className="sticky top-0 z-50 mb-10 flex h-24 w-full flex-col gap-6 border-b border-white/20 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-10">
                    <div className="flex items-center gap-4">
                        <Link href="/manager/shops">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl border border-white/40 bg-white/50 shadow-sm backdrop-blur-md hover:bg-white/80"
                            >
                                <ArrowLeft className="h-5 w-5 text-pink-600" />
                            </Button>
                        </Link>
                        <div className="h-10 w-[1px] bg-pink-100" />
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tight text-slate-900">
                                Gestion de Caisse
                            </h1>
                            <p className="text-xs font-bold text-pink-500 uppercase">
                                Tableau de Bord
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 border-l border-slate-200/50 pl-6">
                            <div className="flex flex-col items-end text-right">
                                <div className="text-sm leading-none font-black text-slate-900">
                                    {auth.user.name}
                                </div>
                                <div className="mt-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                    {auth.user.role}{' '}
                                    {auth.user.shop
                                        ? `• ${auth.user.shop}`
                                        : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-64 animate-pulse rounded-3xl bg-slate-200"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {registers.map((register) => (
                            <CashRegisterCard
                                key={register.id}
                                register={register}
                                onOpenSession={handleOpenSession}
                            />
                        ))}

                        {registers.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center space-y-6 py-20 text-center">
                                <div className="rounded-full bg-slate-100 p-8">
                                    <Store className="h-16 w-16 text-slate-300" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                        Aucune caisse trouvée
                                    </h3>
                                    <p className="mt-2 font-medium text-slate-500">
                                        Une caisse doit être configurée pour commencer à gérer les fonds.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleCreateDefaultRegister}
                                    className="h-14 rounded-2xl bg-indigo-600 px-10 text-xs font-black tracking-widest text-white uppercase shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:scale-105"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Configurer la Caisse Principale
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            <OpenSessionModal
                isOpen={isOpeningSession}
                onClose={() => setIsOpeningSession(false)}
                register={selectedRegister}
                onSuccess={handleSessionSuccess}
            />
        </AppMain>
    );
}
