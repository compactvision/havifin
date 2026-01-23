import { base44, type User } from '@/api/base44Client';
import ManagerModal from '@/components/admin/ManagerModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import AppMain from '@/layouts/app-main';
import { Head, Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Mail,
    MapPin,
    Search,
    Smartphone,
    Store,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShopDetailProps {
    id: string;
}

export default function ShopDetail({ id }: ShopDetailProps) {
    const { auth } = usePage().props as any;
    const shopId = parseInt(id);
    const queryClient = useQueryClient();
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [isCreatingManager, setIsCreatingManager] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch shop details
    const { data: shop, isLoading: isLoadingShop } = useQuery({
        queryKey: ['shop', shopId],
        queryFn: () => base44.entities.Shop.list(), // Temporarily list all and find one, or update client
        select: (data) => data.find((s) => s.id === shopId),
    });

    // Fetch all users for assignment
    const { data: allUsers } = useQuery({
        queryKey: ['users'],
        queryFn: base44.entities.User.list,
    });

    // Update shop users mutation
    const updateUsersMutation = useMutation({
        mutationFn: (userIds: number[]) =>
            base44.entities.Shop.update(shopId, { user_ids: userIds }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
            toast.success('Personnel mis à jour avec succès');
            setIsAddingUser(false);
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour du personnel');
        },
    });

    if (isLoadingShop) {
        return (
            <AppMain currentPageName="Admin">
                <div className="flex h-screen items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                </div>
            </AppMain>
        );
    }

    if (!shop) {
        return (
            <AppMain currentPageName="Admin">
                <div className="flex h-screen flex-col items-center justify-center space-y-4">
                    <h2 className="text-2xl font-black text-slate-900">
                        Boutique introuvable
                    </h2>
                    <Link href="/admin/shops">
                        <Button variant="outline">Retour à la liste</Button>
                    </Link>
                </div>
            </AppMain>
        );
    }

    const assignedUserIds = shop.users?.map((u) => u.id) || [];

    const handleToggleUser = (userId: number) => {
        const isAssigned = assignedUserIds.includes(userId);
        if (
            isAssigned &&
            !confirm('Êtes-vous sûr de vouloir désassigner cet utilisateur ?')
        ) {
            return;
        }

        const newUserIds = isAssigned
            ? assignedUserIds.filter((id) => id !== userId)
            : [...assignedUserIds, userId];
        updateUsersMutation.mutate(newUserIds);
    };

    return (
        <AppMain currentPageName="Admin">
            <Head title={`Détails - ${shop?.name || ''}`} />

            <div className="min-h-screen bg-[#f8fafc] px-6 py-8 md:px-10">
                <header className="sticky top-0 z-50 mb-10 flex h-24 w-full flex-col gap-6 border-b border-white/20 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-10">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/shops">
                            <motion.div whileHover={{ x: -4 }}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-2xl border border-white/40 bg-white/50 shadow-sm backdrop-blur-md hover:bg-white/80"
                                >
                                    <ArrowLeft className="h-5 w-5 text-indigo-600" />
                                </Button>
                            </motion.div>
                        </Link>
                        <div className="h-10 w-[1px] bg-slate-200" />
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="relative flex h-16 w-38 items-center justify-center p-2"
                        >
                            <img
                                src="/logo-color.png"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setIsCreatingManager(true)}
                                variant="outline"
                                className="h-12 rounded-2xl border-white/40 bg-white/50 px-6 text-xs font-black tracking-widest text-slate-600 uppercase shadow-sm backdrop-blur-md transition-all hover:bg-slate-50"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Nouveau Manager
                            </Button>
                            <Button
                                onClick={() => setIsAddingUser(true)}
                                className="h-12 rounded-2xl bg-indigo-600 px-6 text-xs font-black tracking-widest text-white uppercase shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95"
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Assigner Personnel
                            </Button>
                        </div>

                        <div className="flex items-center gap-4 border-l border-slate-200/50 pl-6">
                            <div className="flex flex-col items-end text-right">
                                <div className="text-sm leading-none font-black text-slate-900">
                                    {auth.user.name}
                                </div>
                                <div className="mt-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                    {auth.user.role}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <ManagerModal
                    isOpen={isCreatingManager}
                    onOpenChange={setIsCreatingManager}
                    shopId={shopId}
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Info Cabinets */}
                    <div className="col-span-1 space-y-6">
                        <Card className="rounded-[2.5rem] border-slate-100 bg-white shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                    Informations Générales
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">
                                            Localisation
                                        </p>
                                        <p className="font-bold text-slate-700">
                                            {shop.address || 'Non spécifiée'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                                        <Store className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">
                                            Nombre de Guichets
                                        </p>
                                        <p className="font-bold text-slate-700">
                                            {shop.counter_count} guichets
                                            configurés
                                        </p>
                                    </div>
                                </div>
                                <Separator className="bg-slate-50" />
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <h4 className="mb-2 text-[10px] font-black text-slate-500 uppercase">
                                        Capacité Actuelle
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 rounded-full bg-slate-200">
                                            <div
                                                className="h-2 rounded-full bg-indigo-500"
                                                style={{
                                                    width: `${Math.min(((shop.users?.length || 0) / (shop.counter_count * 2)) * 100, 100)}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">
                                            {shop.users?.length || 0} agents
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl">
                            <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 bg-indigo-500/20 blur-[80px]" />
                            <h4 className="relative z-10 mb-4 text-xl font-black">
                                Aperçu Rapide
                            </h4>
                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">
                                        Performance
                                    </p>
                                    <p className="text-lg font-black text-white">
                                        100%
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">
                                        Tickets
                                    </p>
                                    <p className="text-lg font-black text-white">
                                        24
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personnel List */}
                    <div className="col-span-1 lg:col-span-2">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                                        <Users className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">
                                        Personnel Assigné
                                    </h3>
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase">
                                    {shop.users?.length || 0} Membres
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {shop.users && shop.users.length > 0 ? (
                                    shop.users.map((user) => (
                                        <Card
                                            key={user.id}
                                            className="group overflow-hidden rounded-[2rem] border-slate-100 bg-white transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-600">
                                                            {user.name
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-900">
                                                                {user.name}
                                                            </h4>
                                                            <Badge
                                                                variant="outline"
                                                                className="mt-1 rounded-lg border-slate-100 bg-slate-50 px-2 py-0 text-[8px] font-black tracking-widest text-slate-500 uppercase"
                                                            >
                                                                {user.role}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleToggleUser(
                                                                user.id,
                                                            )
                                                        }
                                                        className="h-9 w-9 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="mt-6 flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                        <Mail className="h-3 w-3" />{' '}
                                                        {user.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                        <Smartphone className="h-3 w-3" />{' '}
                                                        +243 ...
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/50">
                                        <Users className="mb-3 h-8 w-8 text-slate-200" />
                                        <p className="text-sm font-bold text-slate-400 italic">
                                            Aucun membre assigné
                                        </p>
                                        <Button
                                            variant="link"
                                            onClick={() =>
                                                setIsAddingUser(true)
                                            }
                                            className="font-black text-indigo-600"
                                        >
                                            Assigner maintenant
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {isAddingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl animate-in overflow-hidden rounded-[2.5rem] bg-white shadow-2xl duration-300 zoom-in-95">
                        <div className="border-b border-slate-100 bg-slate-50/50 p-8">
                            <h3 className="text-2xl font-black text-slate-900">
                                Assigner du personnel
                            </h3>
                            <p className="text-sm font-medium text-slate-500">
                                Sélectionnez les membres à ajouter à{' '}
                                {shop?.name}
                            </p>

                            {/* Search Input */}
                            <div className="relative mt-6">
                                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Rechercher un manager..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-12 rounded-xl border-slate-200 pl-11 font-bold focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="custom-scrollbar max-h-[50vh] overflow-y-auto p-8 pr-4">
                            <div className="space-y-3">
                                {(allUsers as User[])
                                    ?.filter(
                                        (u) =>
                                            u.role === 'manager' &&
                                            u.name
                                                .toLowerCase()
                                                .includes(
                                                    searchQuery.toLowerCase(),
                                                ),
                                    )
                                    .map((user) => (
                                        <label
                                            key={user.id}
                                            htmlFor={`assign-${user.id}`}
                                            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                                                assignedUserIds.includes(
                                                    user.id,
                                                )
                                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white font-black text-slate-600 shadow-sm">
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                                        {user.role}
                                                    </p>
                                                </div>
                                            </div>
                                            <Checkbox
                                                id={`assign-${user.id}`}
                                                checked={assignedUserIds.includes(
                                                    user.id,
                                                )}
                                                onCheckedChange={() =>
                                                    handleToggleUser(user.id)
                                                }
                                            />
                                        </label>
                                    ))}
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-slate-100 p-8">
                            <Button
                                onClick={() => setIsAddingUser(false)}
                                className="h-12 rounded-2xl bg-slate-900 px-10 text-xs font-black tracking-widest text-white uppercase shadow-xl transition-all hover:bg-black"
                            >
                                Terminer
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppMain>
    );
}
