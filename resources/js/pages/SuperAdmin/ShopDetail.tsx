import { base44, type User } from '@/api/base44Client';
import ManagerModal from '@/components/admin/ManagerModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppMain from '@/layouts/app-main';
import { Head, Link } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Activity,
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Clock3,
    MapPin,
    RefreshCw,
    Store,
    TicketCheck,
    UserPlus,
    Users,
    WalletCards,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ShopDetailProps {
    id: string;
}

const numberFormatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
});

export default function ShopDetail({ id }: ShopDetailProps) {
    const shopId = Number(id);
    const queryClient = useQueryClient();
    const [isCreatingManager, setIsCreatingManager] = useState(false);
    const [isAssigningManagers, setIsAssigningManagers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: shops,
        isLoading: isLoadingShop,
        isError: isShopError,
    } = useQuery({
        queryKey: ['shops'],
        queryFn: base44.entities.Shop.list,
    });

    const shop = shops?.find((item) => item.id === shopId);

    const {
        data: statistics,
        isLoading: isLoadingStatistics,
        isError: isStatisticsError,
        refetch: refetchStatistics,
        isFetching: isRefreshing,
    } = useQuery({
        queryKey: ['shop-statistics', shopId],
        queryFn: () => base44.entities.Shop.statistics(shopId),
        enabled: Number.isInteger(shopId) && shopId > 0,
        refetchInterval: 60_000,
    });

    const { data: managers = [] } = useQuery({
        queryKey: ['users'],
        queryFn: base44.entities.User.list,
    });

    const assignedManagerIds = useMemo(
        () => statistics?.managers.map((manager) => manager.id) ?? [],
        [statistics],
    );

    const filteredManagers = managers.filter(
        (manager) =>
            manager.role === 'manager' &&
            (manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                manager.email
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())),
    );

    const assignManagersMutation = useMutation({
        mutationFn: (managerIds: number[]) =>
            base44.entities.Shop.assignManagers(shopId, managerIds),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['shop-statistics', shopId],
            });
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            toast.success('Managers de la boutique mis à jour');
        },
        onError: () => toast.error("Impossible de modifier l'affectation"),
    });

    const toggleManager = (managerId: number) => {
        const nextIds = assignedManagerIds.includes(managerId)
            ? assignedManagerIds.filter((id) => id !== managerId)
            : [...assignedManagerIds, managerId];

        assignManagersMutation.mutate(nextIds);
    };

    if (isLoadingShop) {
        return (
            <AppMain currentPageName="Admin">
                <div className="brand-canvas flex min-h-screen items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
                </div>
            </AppMain>
        );
    }

    if (isShopError || !shop) {
        return (
            <AppMain currentPageName="Admin">
                <div className="brand-canvas flex min-h-screen flex-col items-center justify-center gap-4">
                    <Store className="h-12 w-12 text-slate-300" />
                    <h1 className="text-2xl font-bold text-slate-900">
                        Boutique introuvable
                    </h1>
                    <Link href="/admin/shops">
                        <Button>Retour aux boutiques</Button>
                    </Link>
                </div>
            </AppMain>
        );
    }

    const maxDailyActivity = Math.max(
        1,
        ...(statistics?.daily.map((day) =>
            Math.max(day.tickets, day.transactions),
        ) ?? []),
    );

    return (
        <AppMain currentPageName="Admin">
            <Head title={`Dashboard · ${shop.name}`} />

            <div className="brand-canvas min-h-screen pb-20">
                <header className="brand-hero mb-8 px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
                    <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/shops">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-11 w-11 rounded-xl border-white/20 bg-white/10 text-white shadow-none hover:bg-white hover:text-brand-blue"
                                    aria-label="Retour aux boutiques"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <p className="mb-1 text-[10px] font-black tracking-[0.22em] text-brand-cyan uppercase">
                                    Dashboard boutique
                                </p>
                                <div className="flex items-center gap-2">
                                    <h1 className="brand-title text-3xl text-white sm:text-4xl">
                                        {shop.name}
                                    </h1>
                                    <Badge
                                        className={
                                            shop.is_active
                                                ? 'border border-emerald-300/30 bg-emerald-400/15 text-emerald-100'
                                                : 'border border-white/15 bg-white/10 text-white/60'
                                        }
                                    >
                                        {shop.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/60">
                                    <MapPin className="h-4 w-4" />
                                    {shop.address || 'Adresse non renseignée'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl border-white/20 bg-white/10 text-white shadow-none hover:bg-white hover:text-brand-blue"
                                onClick={() => refetchStatistics()}
                                disabled={isRefreshing}
                            >
                                <RefreshCw
                                    className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                />
                                Actualiser
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl border-white/20 bg-white/10 text-white shadow-none hover:bg-white hover:text-brand-blue"
                                onClick={() => setIsAssigningManagers(true)}
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Affecter
                            </Button>
                            <Button
                                className="rounded-xl border-white/20 bg-white text-brand-blue shadow-xl shadow-black/10 hover:bg-brand-cyan hover:text-brand-deep"
                                onClick={() => setIsCreatingManager(true)}
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Nommer un manager
                            </Button>
                        </div>
                    </div>
                </header>

                <ManagerModal
                    isOpen={isCreatingManager}
                    onOpenChange={setIsCreatingManager}
                    shopId={shopId}
                />

                <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-10">
                    {isStatisticsError ? (
                        <Card className="border-red-100 bg-red-50">
                            <CardContent className="flex items-center justify-between p-6">
                                <p className="font-bold text-red-700">
                                    Les statistiques n'ont pas pu être chargées.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => refetchStatistics()}
                                >
                                    Réessayer
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    label="Tickets aujourd'hui"
                                    value={statistics?.summary.tickets_today}
                                    icon={TicketCheck}
                                    tone="indigo"
                                    loading={isLoadingStatistics}
                                />
                                <StatCard
                                    label="Transactions aujourd'hui"
                                    value={
                                        statistics?.summary.transactions_today
                                    }
                                    icon={WalletCards}
                                    tone="cyan"
                                    loading={isLoadingStatistics}
                                />
                                <StatCard
                                    label="Taux de traitement"
                                    value={
                                        statistics
                                            ? `${statistics.summary.completion_rate}%`
                                            : undefined
                                    }
                                    detail={
                                        statistics
                                            ? `${statistics.summary.completed_today} ticket(s) terminé(s)`
                                            : undefined
                                    }
                                    icon={CheckCircle2}
                                    tone="emerald"
                                    loading={isLoadingStatistics}
                                />
                                <StatCard
                                    label="En attente maintenant"
                                    value={statistics?.summary.waiting_now}
                                    detail={
                                        statistics?.summary
                                            .average_service_minutes != null
                                            ? `Durée moyenne : ${statistics?.summary.average_service_minutes} min`
                                            : 'Durée moyenne indisponible'
                                    }
                                    icon={Clock3}
                                    tone="amber"
                                    loading={isLoadingStatistics}
                                />
                            </section>

                            <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
                                <Card className="rounded-3xl">
                                    <CardContent className="p-6">
                                        <div className="mb-8 flex items-center justify-between">
                                            <div>
                                                <p className="brand-kicker">
                                                    Activité
                                                </p>
                                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                                    Les 7 derniers jours
                                                </h2>
                                            </div>
                                            <BarChart3 className="h-6 w-6 text-slate-300" />
                                        </div>

                                        <div className="flex h-64 items-end gap-3">
                                            {statistics?.daily.map((day) => (
                                                <div
                                                    key={day.date}
                                                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                                                    title={`${day.tickets} tickets · ${day.transactions} transactions`}
                                                >
                                                    <div className="flex h-48 w-full items-end justify-center gap-1">
                                                        <div
                                                            className="w-2/5 rounded-t-lg bg-brand-blue transition-all"
                                                            style={{
                                                                height: `${Math.max(4, (day.tickets / maxDailyActivity) * 100)}%`,
                                                            }}
                                                        />
                                                        <div
                                                            className="w-2/5 rounded-t-lg bg-brand-cyan transition-all"
                                                            style={{
                                                                height: `${Math.max(4, (day.transactions / maxDailyActivity) * 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">
                                                        {day.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-5 flex justify-center gap-5 text-xs font-bold text-slate-500">
                                            <span className="flex items-center gap-2">
                                                <i className="h-2.5 w-2.5 rounded-full bg-brand-blue" />
                                                Tickets
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <i className="h-2.5 w-2.5 rounded-full bg-brand-cyan" />
                                                Transactions
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl">
                                    <CardContent className="p-6">
                                        <div className="mb-6 flex items-center justify-between">
                                            <div>
                                                <p className="brand-kicker">
                                                    Managers
                                                </p>
                                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                                    Équipe responsable
                                                </h2>
                                            </div>
                                            <Badge variant="outline">
                                                {statistics?.summary
                                                    .managers_count ?? 0}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3">
                                            {statistics?.managers.length ? (
                                                statistics.managers.map(
                                                    (manager) => (
                                                        <div
                                                            key={manager.id}
                                                            className="flex items-center gap-3 rounded-2xl bg-brand-blue/[0.035] p-3"
                                                        >
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/20 font-black text-brand-blue">
                                                                {manager.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-black text-slate-800">
                                                                    {
                                                                        manager.name
                                                                    }
                                                                </p>
                                                                <p className="truncate text-xs text-slate-500">
                                                                    {
                                                                        manager.email
                                                                    }
                                                                </p>
                                                            </div>
                                                            <span
                                                                className={`h-2.5 w-2.5 rounded-full ${
                                                                    manager.is_active
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-slate-300'
                                                                }`}
                                                            />
                                                        </div>
                                                    ),
                                                )
                                            ) : (
                                                <EmptyState text="Aucun manager affecté" />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>

                            <section className="grid gap-6 lg:grid-cols-2">
                                <Card className="rounded-3xl">
                                    <CardContent className="p-6">
                                        <SectionTitle
                                            eyebrow="Opérations"
                                            title="Services demandés aujourd'hui"
                                            icon={Activity}
                                        />
                                        <div className="mt-6 space-y-4">
                                            {statistics?.services.length ? (
                                                statistics.services.map(
                                                    (service) => {
                                                        const total =
                                                            statistics.summary
                                                                .tickets_today ||
                                                            1;
                                                        return (
                                                            <div
                                                                key={
                                                                    service.service
                                                                }
                                                            >
                                                                <div className="mb-2 flex justify-between text-sm">
                                                                    <span className="font-bold text-slate-700">
                                                                        {
                                                                            service.service
                                                                        }
                                                                    </span>
                                                                    <span className="font-black text-slate-500">
                                                                        {
                                                                            service.count
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 rounded-full bg-slate-100">
                                                                    <div
                                                                        className="h-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-pink"
                                                                        style={{
                                                                            width: `${(service.count / total) * 100}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )
                                            ) : (
                                                <EmptyState text="Aucun ticket aujourd'hui" />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl">
                                    <CardContent className="p-6">
                                        <SectionTitle
                                            eyebrow="Volumes"
                                            title="Transactions par devise"
                                            icon={WalletCards}
                                        />
                                        <div className="mt-6 space-y-3">
                                            {statistics?.volumes.length ? (
                                                statistics.volumes.map(
                                                    (volume) => (
                                                        <div
                                                            key={
                                                                volume.currency
                                                            }
                                                            className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"
                                                        >
                                                            <div>
                                                                <Badge className="bg-brand-cyan/15 text-brand-blue">
                                                                    {
                                                                        volume.currency
                                                                    }
                                                                </Badge>
                                                                <p className="mt-2 text-xs font-bold text-slate-400">
                                                                    {
                                                                        volume.transactions
                                                                    }{' '}
                                                                    transaction(s)
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-slate-900">
                                                                    {numberFormatter.format(
                                                                        volume.amount,
                                                                    )}
                                                                </p>
                                                                <p className="text-xs font-bold text-emerald-600">
                                                                    Commission :{' '}
                                                                    {numberFormatter.format(
                                                                        volume.commission,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ),
                                                )
                                            ) : (
                                                <EmptyState text="Aucune transaction aujourd'hui" />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>
                        </>
                    )}
                </main>
            </div>

            {isAssigningManagers && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-100 p-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Affecter les managers
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Boutique : {shop.name}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsAssigningManagers(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6">
                            <Input
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder="Rechercher un manager..."
                                className="mb-5 h-11 rounded-xl"
                            />
                            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                                {filteredManagers.map((manager: User) => (
                                    <label
                                        key={manager.id}
                                        htmlFor={`manager-${manager.id}`}
                                        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
                                    >
                                        <Checkbox
                                            id={`manager-${manager.id}`}
                                            checked={assignedManagerIds.includes(
                                                manager.id,
                                            )}
                                            disabled={
                                                assignManagersMutation.isPending
                                            }
                                            onCheckedChange={() =>
                                                toggleManager(manager.id)
                                            }
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-black text-slate-800">
                                                {manager.name}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {manager.email}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                                {!filteredManagers.length && (
                                    <EmptyState text="Aucun manager disponible" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppMain>
    );
}

function StatCard({
    label,
    value,
    detail,
    icon: Icon,
    tone,
    loading,
}: {
    label: string;
    value?: number | string;
    detail?: string;
    icon: typeof Activity;
    tone: 'indigo' | 'cyan' | 'emerald' | 'amber';
    loading: boolean;
}) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <Card className="relative overflow-hidden rounded-3xl">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                            {label}
                        </p>
                        {loading ? (
                            <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
                        ) : (
                            <p className="mt-2 text-3xl font-black text-slate-900">
                                {value ?? 0}
                            </p>
                        )}
                    </div>
                    <div className={`rounded-2xl p-3 ${tones[tone]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                {detail && (
                    <p className="mt-3 text-xs font-bold text-slate-400">
                        {detail}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function SectionTitle({
    eyebrow,
    title,
    icon: Icon,
}: {
    eyebrow: string;
    title: string;
    icon: typeof Activity;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="brand-kicker">{eyebrow}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {title}
                </h2>
            </div>
            <Icon className="h-6 w-6 text-slate-300" />
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm font-bold text-slate-400">
            {text}
        </div>
    );
}
