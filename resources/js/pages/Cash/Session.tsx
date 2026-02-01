import CloseSessionModal from '@/components/cash/CloseSessionModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppMain from '@/layouts/app-main';
import { CashMovement, CashSession } from '@/types/cash';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    CheckCircle2,
    Clock,
    History,
    Lock,
    Unlock,
    User,
} from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';

interface Props {
    id: string; // Session ID from URL
}

export default function CashSessionDetail({ id }: Props) {
    const { auth } = usePage().props as any;
    const queryClient = useQueryClient();
    const [isClosingSession, setIsClosingSession] = useState(false);

    const { data: session, isLoading } = useQuery<CashSession>({
        queryKey: ['cash-session', id],
        queryFn: async () => {
            const { data } = await axios.get(`/api/cash-sessions/${id}`);
            return data;
        },
    });

    const { data: movements = [] } = useQuery<CashMovement[]>({
        queryKey: ['cash-movements', id],
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/cash-sessions/${id}/movements`,
            );
            return data.data; // Paginated response usually has data property
        },
        enabled: !!session,
    });

    const handleCloseSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['cash-session', id] });
        queryClient.invalidateQueries({ queryKey: ['cash-registers'] }); // Update dashboard
    };

    if (isLoading || !session) {
        return (
            <AppMain currentPageName="CashMoney">
                <div className="flex h-screen items-center justify-center">
                    Chargement...
                </div>
            </AppMain>
        );
    }

    const isOpen = session.status === 'open';

    // Calculate totals for verification
    const calculateStats = (currency: string) => {
        const amount = session.amounts?.find((a) => a.currency === currency);
        if (!amount) return null;

        const opening = parseFloat(amount.opening_amount);
        const closingReal = amount.closing_amount_real
            ? parseFloat(amount.closing_amount_real)
            : null;

        // Calculate total in/out from movements
        const currencyMovements = movements.filter(
            (m) => m.currency === currency,
        );
        const totalIn = currencyMovements
            .filter((m) => parseFloat(m.amount) > 0)
            .reduce((sum, m) => sum + parseFloat(m.amount), 0);

        const totalOut = currencyMovements
            .filter((m) => parseFloat(m.amount) < 0)
            .reduce((sum, m) => sum + Math.abs(parseFloat(m.amount)), 0);

        const theoretical = opening + totalIn - totalOut;
        const difference =
            closingReal !== null ? closingReal - theoretical : null;

        return {
            currency,
            opening,
            totalIn,
            totalOut,
            theoretical,
            closingReal,
            difference,
            status:
                !isOpen && closingReal !== null
                    ? Math.abs(difference!) < 0.01
                        ? 'perfect'
                        : 'mismatch'
                    : 'pending',
        };
    };

    const currencies = ['USD', 'CDF', 'EUR'];
    const stats = currencies.map((c) => calculateStats(c)).filter(Boolean);

    return (
        <AppMain currentPageName="CashMoney">
            <Head title={`Session #${session.id}`} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 px-6 py-8 md:px-10">
                {/* Premium Header */}
                <header className="sticky top-0 z-50 mb-10 flex h-24 w-full flex-col gap-6 border-b border-white/20 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-10">
                    <div className="flex items-center gap-4">
                        <Link href="/cash/dashboard">
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
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black tracking-tight text-slate-900">
                                    Session #{session.id}
                                </h1>
                                <Badge
                                    variant={isOpen ? 'default' : 'secondary'}
                                    className={
                                        isOpen
                                            ? 'bg-green-500 hover:bg-green-600'
                                            : 'bg-slate-200 text-slate-600'
                                    }
                                >
                                    {isOpen ? (
                                        <Unlock className="mr-1 h-3 w-3" />
                                    ) : (
                                        <Lock className="mr-1 h-3 w-3" />
                                    )}
                                    {isOpen ? 'OUVERTE' : 'CLÔTURÉE'}
                                </Badge>
                            </div>
                            <p className="text-xs font-bold text-pink-500 uppercase">
                                {session.register?.name} •{' '}
                                {session.register?.shop?.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isOpen && (
                            <>
                                <Button className="h-11 rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                                    <Banknote className="mr-2 h-4 w-4" />
                                    Ajouter Mouvement
                                </Button>
                                <Button
                                    onClick={() => setIsClosingSession(true)}
                                    className="h-11 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 font-bold text-white shadow-lg shadow-pink-500/30 hover:shadow-xl"
                                >
                                    Clôturer la Session
                                </Button>
                            </>
                        )}
                    </div>
                </header>

                {/* Info Cards Grid */}
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
                    <Card className="rounded-3xl border-slate-200/60 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-400 uppercase">
                                Responsable
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900">
                                        {session.user?.name ||
                                            `User #${session.user_id}`}
                                    </p>
                                    <p className="text-xs font-bold text-slate-400">
                                        Caissier
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-slate-200/60 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-400 uppercase">
                                Horaire
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">
                                        {moment(session.opened_at).format(
                                            'HH:mm',
                                        )}
                                    </p>
                                    <p className="text-xs font-bold text-slate-400">
                                        Ouverture
                                    </p>
                                </div>
                                {session.closed_at && (
                                    <>
                                        <div className="h-8 w-[1px] bg-slate-100" />
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {moment(
                                                    session.closed_at,
                                                ).format('HH:mm')}
                                            </p>
                                            <p className="text-xs font-bold text-slate-400">
                                                Fermeture
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-2 rounded-3xl border-slate-200/60 bg-slate-900 text-white shadow-sm">
                        <CardContent className="flex h-full items-center justify-between p-6">
                            <div>
                                <h3 className="text-lg font-black">
                                    Besoin d'aide ?
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Contactez un manager si vous constatez une
                                    erreur.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
                            >
                                Signaler un problème
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Audit & Balance Section (The "Review" part) */}
                <h2 className="mb-6 text-2xl font-black text-slate-900">
                    État de la Caisse
                </h2>
                <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {stats.map((stat: any) => (
                        <Card
                            key={stat.currency}
                            className="overflow-hidden rounded-3xl border-slate-200/60 shadow-sm"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                                <span className="font-black text-slate-500">
                                    {stat.currency}
                                </span>
                                {stat.status === 'perfect' && (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />{' '}
                                        OK
                                    </Badge>
                                )}
                                {stat.status === 'mismatch' && (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                        <AlertTriangle className="mr-1 h-3 w-3" />{' '}
                                        ÉCART
                                    </Badge>
                                )}
                            </div>
                            <CardContent className="p-0">
                                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                    <div className="p-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase">
                                            Ouverture
                                        </p>
                                        <p className="text-lg font-bold text-slate-700">
                                            {stat.opening.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50/50 p-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase">
                                            Théorique
                                        </p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {stat.theoretical.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-slate-100">
                                    <div className="p-4">
                                        <p className="text-xs font-bold text-green-500 uppercase">
                                            Entrées
                                        </p>
                                        <p className="font-bold text-green-600">
                                            +{stat.totalIn.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs font-bold text-red-500 uppercase">
                                            Sorties
                                        </p>
                                        <p className="font-bold text-red-600">
                                            -{stat.totalOut.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                {stat.closingReal !== null && (
                                    <div
                                        className={`border-t border-slate-100 p-4 ${Math.abs(stat.difference) > 0.01 ? 'bg-red-50' : 'bg-green-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase">
                                                    Réel (Compté)
                                                </p>
                                                <p className="text-xl font-black text-slate-900">
                                                    {stat.closingReal.toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-500 uppercase">
                                                    Écart
                                                </p>
                                                <p
                                                    className={`text-xl font-black ${Math.abs(stat.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}
                                                >
                                                    {stat.difference > 0
                                                        ? '+'
                                                        : ''}
                                                    {stat.difference.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Movements Table */}
                <h2 className="mb-6 text-2xl font-black text-slate-900">
                    Historique des Mouvements
                </h2>
                <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Heure</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.map((movement) => (
                                <TableRow key={movement.id}>
                                    <TableCell className="font-bold text-slate-500">
                                        {moment(movement.created_at).format(
                                            'HH:mm',
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] tracking-wider uppercase"
                                        >
                                            {movement.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {movement.description}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`font-black ${parseFloat(movement.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}
                                        >
                                            {parseFloat(movement.amount) > 0
                                                ? '+'
                                                : ''}
                                            {movement.amount}{' '}
                                            {movement.currency}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {movements.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="py-12 text-center text-slate-400"
                                    >
                                        <History className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                                        Aucun mouvement enregistré pour cette
                                        session.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal */}
            <CloseSessionModal
                isOpen={isClosingSession}
                onClose={() => setIsClosingSession(false)}
                session={session}
                onSuccess={handleCloseSuccess}
            />
        </AppMain>
    );
}
