import { base44, Session } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRightLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Filter,
    Landmark,
    LayoutGrid,
    List,
    LockOpen,
    Play,
    Search,
    StopCircle,
    Store,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import moment from 'moment';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface SessionReport {
    session: any;
    statistics: any;
    clients: any[];
    transactions: any[];
    activities: any[];
}

export default function SessionManager() {
    const queryClient = useQueryClient();

    // UI State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
        null,
    );
    const [isOpening, setIsOpening] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Filters & Pagination State
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
    const [notes, setNotes] = useState('');

    // Fetch shops
    const { data: shops = [] } = useQuery({
        queryKey: ['manager-shops'],
        queryFn: () => base44.entities.Shop.list(),
    });

    // Set default shop
    React.useEffect(() => {
        if (shops.length > 0 && !selectedShopId) {
            setSelectedShopId(shops[0].id);
        }
    }, [shops, selectedShopId]);

    // Fetch sessions (Paginated)
    const { data: sessionData, isLoading: loadingSessions } = useQuery({
        queryKey: ['sessions', selectedShopId, page, statusFilter, dateFilter],
        queryFn: () =>
            base44.entities.Session.list({
                shop_id: selectedShopId?.toString(),
                status: statusFilter === 'all' ? undefined : statusFilter,
                date: dateFilter || undefined,
                page: page.toString(),
            }),
        enabled: !!selectedShopId,
    });

    const sessions = sessionData?.data || [];
    const pagination = sessionData;

    // Fetch Report for Modal
    const { data: sessionReport, isLoading: loadingReport } =
        useQuery<SessionReport>({
            queryKey: ['session-report', selectedSessionId],
            queryFn: () =>
                base44.entities.Session.report(
                    selectedSessionId!,
                ) as Promise<SessionReport>,
            enabled: !!selectedSessionId,
        });

    const activeSession = sessions.find((s) => s.status === 'open');

    const handleOpenSession = async () => {
        if (!selectedShopId) return;
        setIsOpening(true);
        try {
            await base44.entities.Session.create({
                session_date: moment().format('YYYY-MM-DD'),
                shop_id: selectedShopId,
                notes: notes,
            });
            toast.success('Session ouverte avec succès');
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            setNotes('');
        } catch (error: any) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Erreur lors de l’ouverture';
            toast.error(message);
        } finally {
            setIsOpening(false);
        }
    };

    const handleCloseSession = async (id: number) => {
        setIsClosing(true);
        try {
            await base44.entities.Session.close(id);
            toast.success('Session fermée avec succès');
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        } catch (error: any) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Erreur lors de la fermeture';
            toast.error(message);
        } finally {
            setIsClosing(false);
        }
    };

    const handleReopenSession = async (id: number) => {
        try {
            await base44.entities.Session.reopen(id);
            toast.success('Session réouverte avec succès');
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        } catch (error: any) {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Erreur lors de la réouverture de la session';
            toast.error(message);
        }
    };

    const currentShop = shops.find((s) => s.id === selectedShopId);
    const { auth } = usePage().props as any;
    const user = auth.user;

    return (
        <div className="animate-in space-y-8 pb-10 font-sans duration-500 fade-in slide-in-from-bottom-4">
            {/* Header Area */}
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                    <h3 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        Console{' '}
                        <span className="text-indigo-600">Sessions</span>
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-400">
                        Pilotez l'activité journalière de vos guichets.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Shop Select */}
                    {shops.length > 1 && (
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                                <Store className="h-4 w-4 text-slate-500" />
                            </div>
                            <select
                                className="cursor-pointer border-none bg-transparent pr-10 text-sm font-black text-slate-700 uppercase focus:ring-0"
                                value={selectedShopId || ''}
                                onChange={(e) =>
                                    setSelectedShopId(Number(e.target.value))
                                }
                            >
                                {shops.map((shop) => (
                                    <option key={shop.id} value={shop.id}>
                                        {shop.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* View Toggle */}
                    <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'flex items-center gap-2 rounded-xl p-2 px-4 text-[10px] font-black tracking-widest uppercase transition-all duration-300',
                                viewMode === 'grid'
                                    ? 'bg-white text-indigo-600 shadow-md'
                                    : 'text-slate-400 hover:text-slate-600',
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" /> Grille
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'flex items-center gap-2 rounded-xl p-2 px-4 text-[10px] font-black tracking-widest uppercase transition-all duration-300',
                                viewMode === 'list'
                                    ? 'bg-white text-indigo-600 shadow-md'
                                    : 'text-slate-400 hover:text-slate-600',
                            )}
                        >
                            <List className="h-4 w-4" /> Liste
                        </button>
                    </div>
                </div>
            </div>

            {/* Current Session Action Card */}
            <Card className="relative overflow-hidden rounded-[3rem] border-none bg-white shadow-2xl">
                <div
                    className={cn(
                        'absolute inset-0 z-0 opacity-[0.04]',
                        activeSession ? 'bg-emerald-500' : 'bg-indigo-600',
                    )}
                />

                <CardContent className="relative z-10 p-10">
                    {activeSession ? (
                        <div className="flex flex-col items-center justify-between gap-12 lg:flex-row">
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center gap-6 rounded-[2.5rem] border border-slate-100 bg-slate-50 p-8 shadow-sm">
                                    <div className="rounded-3xl bg-emerald-500 p-5 shadow-xl shadow-emerald-500/30">
                                        <LockOpen className="h-10 w-10 text-white" />
                                    </div>
                                    <div>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-bold tracking-tighter text-emerald-600 uppercase">
                                                Session Active
                                            </span>
                                            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                                                • {currentShop?.name}
                                            </span>
                                        </div>
                                        <div className="text-4xl font-black tracking-tighter text-slate-900">
                                            {moment(
                                                activeSession.session_date,
                                            ).format('DD MMMM YYYY')}
                                        </div>
                                        <div className="mt-3 flex items-center gap-4 text-sm font-bold text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-4 w-4 text-indigo-500" />{' '}
                                                {moment(
                                                    activeSession.opened_at,
                                                ).format('HH:mm')}
                                            </span>
                                            <span className="h-4 w-[1px] bg-slate-200" />
                                            <span className="flex items-center gap-1.5">
                                                <Users className="h-4 w-4 text-indigo-500" />{' '}
                                                {activeSession.opened_by}{' '}
                                                (Opérateur)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full flex-col items-center gap-4 lg:w-96">
                                <Button
                                    onClick={() =>
                                        handleCloseSession(activeSession.id)
                                    }
                                    disabled={isClosing}
                                    className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[2.5rem] bg-slate-900 text-sm font-black tracking-widest text-white uppercase shadow-2xl transition-all hover:bg-black active:scale-95"
                                >
                                    <div className="flex items-center gap-3">
                                        <StopCircle
                                            className={cn(
                                                'h-7 w-7 text-red-500',
                                                isClosing && 'animate-pulse',
                                            )}
                                        />
                                        Fermer la Boutique
                                    </div>
                                    <span className="text-[9px] font-bold opacity-40">
                                        Arrêter le flux de transactions
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        setSelectedSessionId(activeSession.id)
                                    }
                                    className="rounded-2xl font-bold text-indigo-600 hover:bg-indigo-50"
                                >
                                    Consulter les statistiques en direct
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-between gap-12 lg:flex-row">
                            <div className="flex-1 space-y-8">
                                <div className="flex items-start gap-6">
                                    <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                                        <AlertCircle className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <div>
                                        <h4 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
                                            Prêt pour l'ouverture ?
                                        </h4>
                                        <p className="max-w-lg leading-relaxed font-medium text-slate-500">
                                            Aucune session n'est ouverte pour{' '}
                                            <span className="font-bold text-indigo-600">
                                                {currentShop?.name}
                                            </span>{' '}
                                            aujourd'hui. Ouvrez une session pour
                                            autoriser les caissiers à traiter
                                            les tickets.
                                        </p>
                                    </div>
                                </div>

                                <div className="max-w-xl space-y-4">
                                    <Label className="ml-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Commentaire d'ouverture
                                    </Label>
                                    <Input
                                        value={notes}
                                        onChange={(e) =>
                                            setNotes(e.target.value)
                                        }
                                        placeholder="Ex: Fond de caisse, équipe du jour..."
                                        className="h-16 rounded-3xl border-slate-200 bg-slate-50 px-8 font-bold text-slate-700 transition-colors focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="group relative w-full overflow-hidden rounded-[3rem] bg-indigo-600 p-8 text-white shadow-2xl shadow-indigo-600/20 lg:w-96">
                                <div className="absolute top-0 right-0 h-40 w-40 translate-x-1/2 -translate-y-1/2 bg-white/10 blur-[60px]" />
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-2xl bg-white/20 p-4">
                                            <Calendar className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] leading-none font-black tracking-widest uppercase opacity-60">
                                                Session du
                                            </div>
                                            <div className="text-2xl font-black">
                                                {moment().format('DD/MM/YYYY')}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleOpenSession}
                                        disabled={isOpening || !selectedShopId}
                                        className="flex h-20 w-full items-center justify-center gap-3 rounded-[2rem] bg-white text-xs font-black tracking-[0.2em] text-indigo-600 uppercase shadow-xl transition-all hover:bg-slate-50 active:scale-95"
                                    >
                                        {isOpening ? (
                                            <Clock className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Play className="h-5 w-5 fill-indigo-600" />
                                        )}
                                        Ouvrir Session
                                    </Button>
                                    <p className="text-center text-[9px] font-black tracking-widest uppercase opacity-60">
                                        Active le terminal client immédiatement
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* History Header & Filters */}
            <div className="space-y-8 pt-10">
                <div className="flex flex-col items-end justify-between gap-6 border-b border-slate-100 pb-8 lg:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
                        <div>
                            <h4 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                Registre Historique
                            </h4>
                            <p className="mt-0.5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                {pagination?.total || 0} sessions enregistrées
                                au total
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-4 lg:w-auto">
                        <div className="flex h-14 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all focus-within:border-indigo-500 lg:min-w-[200px] lg:flex-none">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full border-none bg-transparent text-xs font-bold text-slate-600 focus:ring-0"
                            />
                        </div>

                        <div className="flex h-14 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all focus-within:border-indigo-500 lg:min-w-[200px] lg:flex-none">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full border-none bg-transparent text-xs font-bold text-slate-600 uppercase focus:ring-0"
                            >
                                <option value="all">Tous les Statuts</option>
                                <option value="open">En Cours</option>
                                <option value="closed">Clôturées</option>
                            </select>
                        </div>

                        {(dateFilter || statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setDateFilter('');
                                    setStatusFilter('all');
                                }}
                                className="h-14 w-14 rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {loadingSessions ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex h-96 flex-col items-center justify-center space-y-6"
                        >
                            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            <p className="text-xs font-black tracking-widest text-slate-400 uppercase">
                                Chargement du registre...
                            </p>
                        </motion.div>
                    ) : sessions.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex h-96 flex-col items-center justify-center space-y-4 rounded-[3rem] border-2 border-dashed border-slate-100"
                        >
                            <div className="rounded-full bg-slate-50 p-6 text-slate-300">
                                <Search className="h-12 w-12" />
                            </div>
                            <p className="text-xs font-black tracking-widest text-slate-400 uppercase">
                                Aucune session trouvée
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={viewMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                                    {sessions.map((session) => (
                                        <SessionGridCard
                                            key={session.id}
                                            session={session}
                                            userRole={user?.role}
                                            onView={() =>
                                                setSelectedSessionId(session.id)
                                            }
                                            onClose={() =>
                                                handleCloseSession(session.id)
                                            }
                                            onReopen={() =>
                                                handleReopenSession(session.id)
                                            }
                                        />
                                    ))}
                                </div>
                            ) : (
                                <SessionListView
                                    sessions={sessions}
                                    userRole={user?.role}
                                    onView={(id) => setSelectedSessionId(id)}
                                    onClose={(id) => handleCloseSession(id)}
                                    onReopen={(id) => handleReopenSession(id)}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pagination Controls */}
                {pagination && pagination.last_page > 1 && (
                    <div className="mt-12 flex items-center justify-center gap-4 self-center rounded-3xl border border-white bg-white/50 p-4 backdrop-blur-sm">
                        <Button
                            variant="ghost"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="h-12 w-12 rounded-2xl border border-slate-100 hover:bg-white"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            {Array.from({
                                length: Math.min(pagination.last_page, 5),
                            }).map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={cn(
                                            'h-12 w-12 rounded-2xl text-xs font-black transition-all',
                                            page === pageNum
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                : 'text-slate-400 hover:bg-white hover:text-slate-600',
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {pagination.last_page > 5 && (
                                <span className="mx-2 text-slate-300">•••</span>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            disabled={page === pagination.last_page}
                            onClick={() => setPage(page + 1)}
                            className="h-12 w-12 rounded-2xl border border-slate-100 hover:bg-white"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {selectedSessionId && sessionReport && (
                    <SessionModal
                        session={sessionReport?.session}
                        stats={sessionReport?.statistics}
                        clients={sessionReport?.clients}
                        transactions={sessionReport?.transactions}
                        activities={sessionReport?.activities}
                        loading={loadingReport}
                        onClose={() => setSelectedSessionId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Subcomponents ---

function SessionGridCard({
    session,
    userRole,
    onView,
    onClose,
    onReopen,
}: {
    session: Session;
    userRole?: string;
    onView: () => void;
    onClose: () => void;
    onReopen: () => void;
}) {
    const isToday = moment(session.session_date).isSame(moment(), 'day');
    return (
        <Card className="group hover:shadow-3xl relative overflow-hidden rounded-[2.5rem] border border-none border-transparent bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 hover:border-indigo-100">
            <div
                className={cn(
                    'absolute top-0 right-0 h-2 w-full',
                    session.status === 'open'
                        ? 'animate-pulse bg-emerald-500'
                        : 'bg-slate-200',
                )}
            />

            <div className="mb-8 flex items-start justify-between">
                <div className="rounded-2xl bg-slate-50 p-4 transition-colors duration-500 group-hover:bg-indigo-50">
                    <Calendar className="h-7 w-7 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <div
                    className={cn(
                        'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase',
                        session.status === 'open'
                            ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                            : 'border border-slate-200 bg-slate-100 text-slate-500',
                    )}
                >
                    {session.status === 'open' ? (
                        <div className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
                    ) : null}
                    {session.status === 'open' ? 'En cours' : 'Terminé'}
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="mb-1 text-2xl font-black tracking-tight text-slate-900">
                        {moment(session.session_date).format('DD MMMM YYYY')}
                    </div>
                    {isToday && (
                        <p className="text-[10px] leading-none font-black tracking-widest text-indigo-500 uppercase">
                            Aujourd'hui
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-50 bg-slate-50/50 p-4 text-xs font-bold text-slate-400">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-60">
                            Ouverture
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                            <Clock className="h-3 w-3" />
                            {moment(session.opened_at).format('HH:mm')}
                        </span>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200" />
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-60">
                            Clôture
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                            {session.closed_at ? (
                                <>
                                    <Clock className="h-3 w-3" />
                                    {moment(session.closed_at).format('HH:mm')}
                                </>
                            ) : (
                                '--:--'
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        onClick={onView}
                        className="h-14 flex-1 rounded-2xl bg-indigo-600 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95"
                    >
                        <Eye className="mr-2 h-4 w-4" /> Rapport
                    </Button>
                    {session.status === 'open' && (
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="h-14 w-14 rounded-2xl border-slate-200 text-red-500 transition-all hover:border-red-100 hover:bg-red-50 active:scale-95"
                        >
                            <StopCircle className="h-5 w-5" />
                        </Button>
                    )}
                    {session.status === 'closed' &&
                        userRole === 'super-admin' && (
                            <Button
                                onClick={onReopen}
                                variant="outline"
                                className="h-14 w-14 rounded-2xl border-indigo-200 text-indigo-500 transition-all hover:bg-indigo-50 active:scale-95"
                                title="Réouvrir la session"
                            >
                                <Play className="h-5 w-5" />
                            </Button>
                        )}
                </div>
            </div>
        </Card>
    );
}

function SessionListView({
    sessions,
    userRole,
    onView,
    onClose,
    onReopen,
}: {
    sessions: Session[];
    userRole?: string;
    onView: (id: number) => void;
    onClose: (id: number) => void;
    onReopen: (id: number) => void;
}) {
    return (
        <div className="w-full overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/30">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="bg-slate-50/80 backdrop-blur-md">
                        <th className="p-8 text-[11px] font-black tracking-widest text-slate-400 uppercase first:rounded-tl-[2.5rem]">
                            Date
                        </th>
                        <th className="p-8 text-[11px] font-black tracking-widest text-slate-400 uppercase">
                            Boutique / Guichet
                        </th>
                        <th className="p-8 text-[11px] font-black tracking-widest text-slate-400 uppercase">
                            Statut
                        </th>
                        <th className="p-8 text-[11px] font-black tracking-widest text-slate-400 uppercase">
                            Horaire
                        </th>
                        <th className="p-8 text-right text-[11px] font-black tracking-widest text-slate-400 uppercase last:rounded-tr-[2.5rem]">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sessions.map((session) => (
                        <tr
                            key={session.id}
                            className="group transition-colors hover:bg-slate-50/50"
                        >
                            <td className="p-8 whitespace-nowrap">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-black tracking-tight text-slate-700">
                                        {moment(session.session_date).format(
                                            'DD/MM/YYYY',
                                        )}
                                    </span>
                                </div>
                            </td>
                            <td className="p-8">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">
                                        {session.shop?.name ||
                                            'Agence Centrale'}
                                    </span>
                                    <span className="mt-0.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                                        ID: {session.shop_id}
                                    </span>
                                </div>
                            </td>
                            <td className="p-8">
                                <span
                                    className={cn(
                                        'rounded-full px-4 py-1.5 text-[9px] font-black tracking-widest uppercase',
                                        session.status === 'open'
                                            ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                                            : 'bg-slate-100 text-slate-400',
                                    )}
                                >
                                    {session.status === 'open'
                                        ? 'En Cours'
                                        : 'Clôturé'}
                                </span>
                            </td>
                            <td className="p-8">
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                    <div className="flex flex-col">
                                        <span className="mb-0.5 text-[9px] uppercase opacity-50">
                                            Ouvert
                                        </span>
                                        <span className="text-slate-600">
                                            {moment(session.opened_at).format(
                                                'HH:mm',
                                            )}
                                        </span>
                                    </div>
                                    <ArrowRightLeft className="h-3 w-3 opacity-20" />
                                    <div className="flex flex-col">
                                        <span className="mb-0.5 text-[9px] uppercase opacity-50">
                                            Fermé
                                        </span>
                                        <span className="text-slate-600">
                                            {session.closed_at
                                                ? moment(
                                                      session.closed_at,
                                                  ).format('HH:mm')
                                                : '--:--'}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-8 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        onClick={() => onView(session.id)}
                                        className="h-10 rounded-xl bg-indigo-50 px-4 text-[10px] font-black tracking-widest text-indigo-600 uppercase shadow-none transition-all hover:bg-indigo-600 hover:text-white"
                                    >
                                        <Eye className="mr-2 h-3.5 w-3.5" />{' '}
                                        Rapport
                                    </Button>
                                    {session.status === 'open' && (
                                        <Button
                                            onClick={() => onClose(session.id)}
                                            size="icon"
                                            className="h-10 w-10 rounded-xl bg-red-50 text-red-500 shadow-none transition-all hover:bg-red-500 hover:text-white"
                                        >
                                            <StopCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {session.status === 'closed' &&
                                        userRole === 'super-admin' && (
                                            <Button
                                                onClick={() =>
                                                    onReopen(session.id)
                                                }
                                                size="icon"
                                                className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-500 shadow-none transition-all hover:bg-indigo-500 hover:text-white"
                                                title="Réouvrir la session"
                                            >
                                                <Play className="h-4 w-4" />
                                            </Button>
                                        )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SessionModal({
    session,
    stats,
    clients,
    transactions,
    activities,
    loading,
    onClose,
}: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 font-sans md:p-12">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[3.5rem] border border-white/20 bg-[#f8fafc] shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
            >
                {/* Modal Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white p-8 md:p-12">
                    <div className="flex items-center gap-6">
                        <div className="rounded-[2rem] bg-indigo-600 p-5 shadow-xl shadow-indigo-600/30">
                            <TrendingUp className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <div className="mb-1 flex items-center gap-3">
                                <h3 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                                    Rapport de Session
                                </h3>
                                <span
                                    className={cn(
                                        'rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase',
                                        session?.status === 'open'
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-slate-100 text-slate-500',
                                    )}
                                >
                                    {session?.status === 'open'
                                        ? 'Live'
                                        : 'Archivé'}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-slate-400">
                                {session
                                    ? moment(session.session_date).format(
                                          'dddd DD MMMM YYYY',
                                      )
                                    : 'Chargement...'}{' '}
                                • Guichet {session?.shop?.name}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="h-16 w-16 rounded-[2rem] bg-slate-50 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                    >
                        <X className="h-8 w-8" />
                    </Button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 space-y-12 overflow-y-auto p-8 md:p-12">
                    {loading ? (
                        <div className="flex h-96 flex-col items-center justify-center space-y-6">
                            <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                            <p className="animate-pulse text-sm font-black tracking-widest text-slate-400 uppercase">
                                Synthèse des données...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                                <StatItem
                                    title="Clients"
                                    value={stats?.total_clients}
                                    icon={Users}
                                    color="blue"
                                />
                                <StatItem
                                    title="Transactions"
                                    value={stats?.total_transactions}
                                    icon={ArrowRightLeft}
                                    color="emerald"
                                />
                                <StatItem
                                    title="Volume USD"
                                    value={`$ ${stats?.volume_usd?.toLocaleString()}`}
                                    icon={TrendingUp}
                                    color="indigo"
                                />
                                <StatItem
                                    title="Volume CDF"
                                    value={`${stats?.volume_cdf?.toLocaleString()} FC`}
                                    icon={Landmark}
                                    color="amber"
                                />
                            </div>

                            {/* Detailed Tables */}
                            <div className="space-y-12">
                                {/* Transactions List */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-1 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                        <h5 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                            Flux Financier
                                        </h5>
                                    </div>
                                    <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/20">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50/50">
                                                    <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                        Heure
                                                    </th>
                                                    <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                        Opération
                                                    </th>
                                                    <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                        Montant Envoyé
                                                    </th>
                                                    <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                        Montant Reçu
                                                    </th>
                                                    <th className="p-6 text-right text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                        Commission
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {transactions?.map(
                                                    (tx: any) => (
                                                        <tr
                                                            key={tx.id}
                                                            className="transition-colors hover:bg-slate-50/30"
                                                        >
                                                            <td className="p-6 text-xs font-bold text-slate-500">
                                                                {moment(
                                                                    tx.created_at,
                                                                ).format(
                                                                    'HH:mm:ss',
                                                                )}
                                                            </td>
                                                            <td className="p-6">
                                                                <span className="text-xs font-black tracking-tighter text-slate-800 uppercase">
                                                                    {
                                                                        tx.operation_type
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="p-6">
                                                                <span className="text-sm font-black text-emerald-600">
                                                                    {tx.amount_from?.toLocaleString()}{' '}
                                                                    {
                                                                        tx.currency_from
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="p-6">
                                                                <span className="text-sm font-black text-slate-600">
                                                                    {tx.amount_to?.toLocaleString()}{' '}
                                                                    {
                                                                        tx.currency_to
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="p-6 text-right">
                                                                <span className="text-xs font-black text-indigo-600">
                                                                    ${' '}
                                                                    {
                                                                        tx.commission
                                                                    }
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                                {transactions?.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="p-12 text-center text-xs font-black tracking-widest text-slate-300 uppercase"
                                                        >
                                                            Aucune transaction
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Operator Performance */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-1 rounded-full bg-indigo-500" />
                                        <h5 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                            Performance Opérateurs
                                        </h5>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {stats?.cashier_stats?.map(
                                            (op: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="group rounded-[2rem] border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/30 transition-all hover:border-indigo-200"
                                                >
                                                    <div className="mb-6 flex items-center gap-4">
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white">
                                                            {op.cashier.charAt(
                                                                0,
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black tracking-tighter text-slate-800">
                                                                {op.cashier}
                                                            </div>
                                                            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                                Opérateur
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="rounded-xl bg-slate-50 p-4">
                                                            <div className="mb-1 text-[9px] font-black text-slate-400 uppercase">
                                                                Appels
                                                            </div>
                                                            <div className="text-xl font-black text-slate-700">
                                                                {
                                                                    op.clients_called
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl bg-slate-50 p-4">
                                                            <div className="mb-1 text-[9px] font-black text-slate-400 uppercase">
                                                                Succès
                                                            </div>
                                                            <div className="text-xl font-black text-emerald-600">
                                                                {
                                                                    op.transactions_completed
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white p-8 md:p-12">
                    <div className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                        Document généré le {moment().format('DD/MM/YYYY HH:mm')}
                    </div>
                    <Button
                        onClick={onClose}
                        className="h-14 rounded-2xl bg-slate-900 px-10 text-xs font-black tracking-widest text-white uppercase"
                    >
                        Fermer le Rapport
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

function StatItem({ title, value, icon: Icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-500 text-blue-500 border-blue-100 shadow-blue-500/20',
        emerald:
            'bg-emerald-500 text-emerald-500 border-emerald-100 shadow-emerald-500/20',
        indigo: 'bg-indigo-500 text-indigo-500 border-indigo-100 shadow-indigo-500/20',
        amber: 'bg-amber-500 text-amber-500 border-amber-100 shadow-amber-500/20',
    };
    return (
        <div className="flex flex-col items-center rounded-[2.5rem] border border-slate-100 bg-white p-8 text-center shadow-xl shadow-slate-200/30">
            <div
                className={cn(
                    'mb-6 rounded-2xl p-5 shadow-xl',
                    colors[color].split(' ')[0],
                    'bg-opacity-10',
                )}
            >
                <Icon className={cn('h-8 w-8', colors[color].split(' ')[1])} />
            </div>
            <div className="mb-2 text-[11px] font-black tracking-widest text-slate-400 uppercase">
                {title}
            </div>
            <div className="text-3xl leading-none font-black tracking-tighter text-slate-900">
                {value}
            </div>
        </div>
    );
}
