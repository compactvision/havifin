import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppMain from '@/layouts/app-main';
import { CashSession } from '@/types/cash';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    Banknote,
    Clock,
    DollarSign,
    LogOut,
    Store,
    Unlock,
} from 'lucide-react';
import moment from 'moment';

export default function CashierTodaySession() {
    const { auth } = usePage().props as any;

    // Fetch current active session for this user
    const { data: session, isLoading } = useQuery<CashSession | null>({
        queryKey: ['cash-session-current'],
        queryFn: () => base44.entities.CashSession.current(),
        retry: false,
    });

    if (isLoading) {
        return (
            <AppMain currentPageName="Cashier">
                <div className="flex h-screen items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        <p className="font-bold text-slate-500">
                            Chargement de votre session...
                        </p>
                    </div>
                </div>
            </AppMain>
        );
    }

    // If no session found
    if (!session) {
        return (
            <AppMain currentPageName="Cashier">
                <Head title="Aucune Session" />
                <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
                    <div className="mb-6 rounded-full bg-indigo-100 p-6 text-indigo-600">
                        <Store className="h-12 w-12" />
                    </div>
                    <h1 className="mb-2 text-2xl font-black text-slate-900">
                        Aucune session active
                    </h1>
                    <p className="mb-8 max-w-md text-slate-500">
                        Vous n'avez pas de session de caisse ouverte pour le
                        moment. Veuillez demander à un manager de vous ouvrir
                        une caisse.
                    </p>
                    <Link href="/logout" method="post" as="button">
                        <Button variant="outline" className="gap-2">
                            <LogOut className="h-4 w-4" />
                            Se déconnecter
                        </Button>
                    </Link>
                </div>
            </AppMain>
        );
    }

    return (
        <AppMain currentPageName="Cashier">
            <Head title="Ma Session" />

            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30 px-6 py-8 md:px-10">
                <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">
                            Bonjour, {auth.user.name} 👋
                        </h1>
                        <p className="mt-1 text-slate-500">
                            Voici le résumé de votre session d'aujourd'hui.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Date
                            </span>
                            <span className="font-black text-slate-900">
                                {moment().format('DD/MM/YYYY')}
                            </span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200" />
                        <div className="rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`h-2 w-2 rounded-full ${session.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}
                                />
                                <span className="font-bold text-slate-700">
                                    {session.status === 'open'
                                        ? 'En ligne'
                                        : 'Hors ligne'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="mx-auto max-w-4xl">
                    {/* Session Card */}
                    <div className="relative overflow-hidden rounded-[32px] bg-white p-8 shadow-xl ring-1 shadow-indigo-100 ring-slate-100">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Store className="h-64 w-64 rotate-12" />
                        </div>

                        <div className="relative z-10">
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                                        <Banknote className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">
                                            Session #{session.id}
                                        </h2>
                                        <p className="font-medium text-slate-500">
                                            {session.register?.name} •{' '}
                                            {session.register?.shop?.name}
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-green-100 px-4 py-2 text-sm font-black text-green-700 hover:bg-green-100">
                                    <Unlock className="mr-2 h-4 w-4" />
                                    OUVERTE
                                </Badge>
                            </div>

                            <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">
                                            Ouverture
                                        </span>
                                    </div>
                                    <p className="text-xl font-black text-slate-900">
                                        {moment(session.opened_at).format(
                                            'HH:mm',
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {moment(session.opened_at).fromNow()}
                                    </p>
                                </div>

                                <div className="col-span-2 rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">
                                            Fonds de caisse initial
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {session.amounts?.map((amount) => (
                                            <div
                                                key={amount.currency}
                                                className="flex items-baseline gap-1"
                                            >
                                                <span className="text-xl font-black text-slate-900">
                                                    {amount.opening_amount}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">
                                                    {amount.currency}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Link
                                    href="/cashier"
                                    className="w-full md:w-auto"
                                >
                                    <Button className="h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 text-lg font-bold text-white shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/50 active:scale-95 md:w-auto">
                                        Accéder au Guichet (Transacter)
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppMain>
    );
}
