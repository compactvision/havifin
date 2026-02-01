import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppMain from '@/layouts/app-main';
import { CashRegister, CashSession } from '@/types/cash';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Eye, Lock, Unlock } from 'lucide-react';
import moment from 'moment';

interface Props {
    id: string; // Register ID
}

export default function RegisterHistory({ id }: Props) {
    const { auth } = usePage().props as any;

    const { data: register, isLoading: isLoadingRegister } =
        useQuery<CashRegister>({
            queryKey: ['cash-register', id],
            queryFn: async () => {
                const { data } = await axios.get(`/api/cash-registers/${id}`);
                return data;
            },
        });

    const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<
        CashSession[]
    >({
        queryKey: ['cash-register-sessions', id],
        queryFn: async () => {
            /*
             * We need a route for this: /api/cash-registers/{id}/sessions
             * For now, assuming we might need to add it or use general sessions filter
             * Let's use general sessions list with query param
             */
            const { data } = await axios.get(
                `/api/cash-sessions?cash_register_id=${id}`,
            );
            return data.data || data;
        },
    });

    const isLoading = isLoadingRegister || isLoadingSessions;

    if (isLoading || !register) {
        return (
            <AppMain currentPageName="CashMoney">
                <div className="flex h-screen items-center justify-center">
                    Chargement...
                </div>
            </AppMain>
        );
    }

    return (
        <AppMain currentPageName="CashMoney">
            <Head title={`Historique - ${register.name}`} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 px-6 py-8 md:px-10">
                {/* Header */}
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
                            <h1 className="text-xl font-black tracking-tight text-slate-900">
                                {register.name}
                            </h1>
                            <p className="text-xs font-bold text-pink-500 uppercase">
                                Historique des Sessions
                            </p>
                        </div>
                    </div>
                </header>

                <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Ouverture</TableHead>
                                <TableHead>Fermeture</TableHead>
                                <TableHead>Caissier</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell className="font-bold">
                                        #{session.id}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                session.status === 'open'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className={
                                                session.status === 'open'
                                                    ? 'bg-green-500'
                                                    : 'bg-slate-200 text-slate-600'
                                            }
                                        >
                                            {session.status === 'open' ? (
                                                <Unlock className="mr-1 h-3 w-3" />
                                            ) : (
                                                <Lock className="mr-1 h-3 w-3" />
                                            )}
                                            {session.status === 'open'
                                                ? 'OUVERTE'
                                                : 'CLÔTURÉE'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">
                                                {moment(
                                                    session.opened_at,
                                                ).format('DD/MM/YYYY')}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {moment(
                                                    session.opened_at,
                                                ).format('HH:mm')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {session.closed_at ? (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">
                                                    {moment(
                                                        session.closed_at,
                                                    ).format('DD/MM/YYYY')}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {moment(
                                                        session.closed_at,
                                                    ).format('HH:mm')}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">
                                                -
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {/* Ideally get user name, assuming user object is loaded or id shown */}
                                        {(session as any).user?.name ||
                                            `User #${session.user_id}`}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/cash/sessions/${session.id}`}
                                        >
                                            <Button variant="ghost" size="sm">
                                                <Eye className="mr-2 h-4 w-4" />
                                                Détails
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sessions.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center text-slate-400"
                                    >
                                        Aucune session trouvée.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppMain>
    );
}
