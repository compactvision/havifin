import { base44, type Counter } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import AppMain from '@/layouts/app-main';
import { cn } from '@/lib/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Image as ImageIcon,
    Monitor,
    Newspaper,
    Plus,
    Store,
    Trash2,
    UserCheck,
    Users,
    UserX,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ManagerShopDetailProps {
    id: string;
}

export default function ManagerShopDetail({ id }: ManagerShopDetailProps) {
    const { auth } = usePage().props as any;
    const shopId = parseInt(id);
    const queryClient = useQueryClient();
    const [isCreatingCounter, setIsCreatingCounter] = useState(false);
    const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
    const [isAssigningCashier, setIsAssigningCashier] = useState(false);
    const [selectedCounter, setSelectedCounter] = useState<Counter | null>(
        null,
    );

    const [counterForm, setCounterForm] = useState({
        counter_number: 1,
        name: '',
    });

    // Fetch shop details
    const { data: allShops, isLoading: isLoadingShop } = useQuery({
        queryKey: ['shops'],
        queryFn: base44.entities.Shop.list,
    });

    const shop = allShops?.find((s) => s.id === shopId);

    // Fetch counters for this shop
    const { data: counters, isLoading: isLoadingCounters } = useQuery({
        queryKey: ['counters', shopId],
        queryFn: () => base44.entities.Counter.list(shopId),
        enabled: !!shopId,
    });

    // Fetch all users to get cashiers
    const { data: allUsers } = useQuery({
        queryKey: ['users'],
        queryFn: base44.entities.User.list,
    });

    // Filter cashiers assigned to this shop
    const availableCashiers = allUsers?.filter(
        (user) =>
            user.role === 'cashier' &&
            (user as any).shops?.some((s: any) => s.id === shopId),
    );

    // Create counter mutation
    const createCounterMutation = useMutation({
        mutationFn: (data: Partial<Counter>) =>
            base44.entities.Counter.create(shopId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['counters', shopId] });
            toast.success('Guichet créé avec succès');
            setIsCreatingCounter(false);
            setCounterForm({ counter_number: 1, name: '' });
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message ||
                    'Erreur lors de la création du guichet',
            );
        },
    });

    // Update counter mutation
    const updateCounterMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Counter> }) =>
            base44.entities.Counter.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['counters', shopId] });
            toast.success('Guichet mis à jour avec succès');
            setIsAssigningCashier(false);
            setSelectedCounter(null);
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour du guichet');
        },
    });

    // Delete counter mutation
    const deleteCounterMutation = useMutation({
        mutationFn: (id: number) => base44.entities.Counter.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['counters', shopId] });
            toast.success('Guichet supprimé avec succès');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression du guichet');
        },
    });

    const handleCreateCounter = (e: React.FormEvent) => {
        e.preventDefault();
        createCounterMutation.mutate(counterForm);
    };

    const [isCreatingCashier, setIsCreatingCashier] = useState(false);
    const [cashierForm, setCashierForm] = useState({
        name: '',
        email: '',
        password: '',
        counter_id: '',
    });

    // Create user mutation
    const createCashierMutation = useMutation({
        mutationFn: async (data: any) => {
            // 1. Create the user
            const newUser = await base44.entities.User.create({
                name: data.name,
                email: data.email,
                password: data.password,
                role: 'cashier',
                is_active: true,
                shop_ids: [shopId], // Assign to current shop
            } as any);

            // 2. If counter selected, assign it
            if (data.counter_id) {
                await base44.entities.Counter.update(
                    parseInt(data.counter_id),
                    {
                        cashier_id: newUser.id,
                    },
                );
            }

            return newUser;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['counters', shopId] });
            toast.success('Caissier créé avec succès');
            setIsCreatingCashier(false);
            setCashierForm({
                name: '',
                email: '',
                password: '',
                counter_id: '',
            });
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message ||
                    'Erreur lors de la création du caissier',
            );
        },
    });

    const handleCreateCashier = (e: React.FormEvent) => {
        e.preventDefault();
        createCashierMutation.mutate(cashierForm);
    };

    const handleAssignCashier = (cashierId: number | null) => {
        if (selectedCounter) {
            updateCounterMutation.mutate({
                id: selectedCounter.id,
                data: { cashier_id: cashierId } as any,
            });
        }
    };

    // Advertisement Management
    const [isCreatingAd, setIsCreatingAd] = useState(false);
    const [adForm, setAdForm] = useState({
        title: '',
        type: 'image' as 'image' | 'video',
        image_url: '',
        display_order: 1,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string>('');

    // Fetch advertisements
    const { data: advertisements = [], isLoading: isLoadingAds } = useQuery({
        queryKey: ['advertisements', shopId],
        queryFn: base44.entities.Advertisement.list,
        enabled: !!shopId,
    });

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            const url = URL.createObjectURL(file);
            setVideoPreview(url);
        }
    };

    // Update advertisement mutation
    const updateAdMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            base44.entities.Advertisement.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] });
            toast.success('Publicité mise à jour');
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour');
        },
    });

    // Delete advertisement mutation
    const deleteAdMutation = useMutation({
        mutationFn: (id: number) => base44.entities.Advertisement.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] });
            toast.success('Publicité supprimée');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression');
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // News Management
    const [isCreatingNews, setIsCreatingNews] = useState(false);
    const [newsForm, setNewsForm] = useState({
        content: '',
        display_order: 1,
    });

    // Fetch news
    const { data: allNews = [], isLoading: isLoadingNews } = useQuery({
        queryKey: ['news', shopId],
        queryFn: base44.entities.News.list,
        enabled: !!shopId,
    });

    // Create news mutation
    const createNewsMutation = useMutation({
        mutationFn: (data: any) => base44.entities.News.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['news'] });
            toast.success('Information ajoutée au défilé');
            setIsCreatingNews(false);
            setNewsForm({ content: '', display_order: 1 });
        },
        onError: () => {
            toast.error("Erreur lors de la création de l'information");
        },
    });

    // Update news mutation
    const updateNewsMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            base44.entities.News.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['news'] });
            toast.success('Information mise à jour');
        },
        onError: () => {
            toast.error('Erreur lors de la mise à jour');
        },
    });

    // Delete news mutation
    const deleteNewsMutation = useMutation({
        mutationFn: (id: number) => base44.entities.News.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['news'] });
            toast.success('Information supprimée');
        },
        onError: () => {
            toast.error('Erreur lors de la suppression');
        },
    });

    const handleCreateNews = (e: React.FormEvent) => {
        e.preventDefault();
        createNewsMutation.mutate(newsForm);
    };

    const toggleNewsStatus = (news: any) => {
        updateNewsMutation.mutate({
            id: news.id,
            data: { is_active: !news.is_active },
        });
    };

    const handleDeleteNews = (news: any) => {
        if (confirm('Supprimer cette information du défilé ?')) {
            deleteNewsMutation.mutate(news.id);
        }
    };

    // Create advertisement mutation
    const createAdMutation = useMutation({
        mutationFn: async (data: any) => {
            const mediaUrl =
                data.type === 'video' ? videoPreview : imagePreview;
            return base44.entities.Advertisement.create({
                title: data.title,
                type: data.type,
                image_url: data.image_url || mediaUrl,
                display_order: data.display_order,
                is_active: true,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] });
            toast.success('Publicité créée avec succès');
            setIsCreatingAd(false);
            setAdForm({
                title: '',
                type: 'image',
                image_url: '',
                display_order: 1,
            });
            setImageFile(null);
            setImagePreview('');
            setVideoFile(null);
            setVideoPreview('');
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message ||
                    'Erreur lors de la création de la publicité',
            );
        },
    });

    const handleCreateAd = (e: React.FormEvent) => {
        e.preventDefault();
        createAdMutation.mutate(adForm);
    };

    const toggleAdStatus = (ad: any) => {
        updateAdMutation.mutate({
            id: ad.id,
            data: { is_active: !ad.is_active },
        });
    };

    const handleDeleteAd = (ad: any) => {
        if (confirm(`Supprimer la publicité "${ad.title}" ?`)) {
            deleteAdMutation.mutate(ad.id);
        }
    };

    const handleDeleteCounter = (counter: Counter) => {
        if (
            confirm(
                `Êtes-vous sûr de vouloir supprimer le guichet "${counter.name}" ?`,
            )
        ) {
            deleteCounterMutation.mutate(counter.id);
        }
    };

    if (isLoadingShop && !shop) {
        return (
            <AppMain currentPageName="Manager">
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-8 md:px-10">
                    <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-32 rounded-3xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-48 rounded-3xl" />
                        ))}
                    </div>
                </div>
            </AppMain>
        );
    }

    if (!shop) {
        return (
            <AppMain currentPageName="Manager">
                <div className="flex h-screen flex-col items-center justify-center">
                    <h2 className="mb-4 text-2xl font-black text-slate-900">
                        Boutique introuvable
                    </h2>
                    <Link href="/manager/shops">
                        <Button>Retour aux boutiques</Button>
                    </Link>
                </div>
            </AppMain>
        );
    }

    const activeCounters = counters?.filter((c) => c.is_active) || [];
    const assignedCounters = counters?.filter((c) => c.cashier_id) || [];

    return (
        <AppMain currentPageName="Manager">
            <Head title={`Gestion - ${shop.name}`} />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-8 md:px-10">
                <header className="sticky top-0 z-50 mb-10 flex h-24 w-full flex-col gap-6 border-b border-white/20 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-10">
                    <div className="flex items-center gap-4">
                        <Link href="/manager/shops">
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
                        <div className="h-10 w-[1px] bg-indigo-100" />
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

                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex gap-3">
                            <Button
                                onClick={() =>
                                    window.open(
                                        `/display?shop_id=${shop.id}`,
                                        '_blank',
                                    )
                                }
                                variant="outline"
                                className="h-12 rounded-2xl border border-purple-100 bg-purple-50/50 px-6 font-bold text-purple-600 hover:bg-purple-100/50"
                            >
                                <Monitor className="mr-2 h-4 w-4" />
                                Lancer l'écran TV
                            </Button>
                            <Button
                                onClick={() => setIsCreatingCashier(true)}
                                className="h-12 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-6 font-bold text-indigo-600 hover:bg-indigo-100/50"
                            >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Nouveau Caissier
                            </Button>
                            <Button
                                onClick={() => setIsCreatingCounter(true)}
                                disabled={
                                    (counters?.length || 0) >=
                                    shop.counter_count
                                }
                                className="h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl active:scale-95"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nouveau Guichet
                            </Button>
                        </div>

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

                {/* Stats Cards */}
                <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm"
                    >
                        <div className="mb-2 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                                <Store className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase">
                                    Guichets Actifs
                                </p>
                                <p className="text-2xl font-black text-slate-900">
                                    {activeCounters.length} /{' '}
                                    {shop.counter_count}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm"
                    >
                        <div className="mb-2 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                                <UserCheck className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase">
                                    Guichets Assignés
                                </p>
                                <p className="text-2xl font-black text-slate-900">
                                    {assignedCounters.length}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm"
                    >
                        <div className="mb-2 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase">
                                    Caissiers Disponibles
                                </p>
                                <p className="text-2xl font-black text-slate-900">
                                    {availableCashiers?.length || 0}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Counters Grid */}
                <div>
                    <h2 className="mb-6 text-2xl font-black text-slate-900">
                        Configuration des Guichets
                    </h2>

                    {isLoadingCounters ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-64 rounded-3xl"
                                />
                            ))}
                        </div>
                    ) : counters && counters.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {counters.map((counter, index) => (
                                <motion.div
                                    key={counter.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-lg"
                                >
                                    {/* Counter Header */}
                                    <div className="mb-4 flex items-start justify-between">
                                        <div>
                                            <div className="mb-1 flex items-center gap-2">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-black text-white">
                                                    {counter.counter_number}
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900">
                                                    {counter.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleDeleteCounter(counter)
                                            }
                                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Cashier Assignment */}
                                    <div className="mb-4">
                                        {counter.cashier ? (
                                            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
                                                <UserCheck className="h-5 w-5 text-emerald-600" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-emerald-600 uppercase">
                                                        Caissier Assigné
                                                    </p>
                                                    <p className="font-bold text-slate-900">
                                                        {counter.cashier.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                                <UserX className="h-5 w-5 text-slate-400" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-400 uppercase">
                                                        Non Assigné
                                                    </p>
                                                    <p className="text-sm font-medium text-slate-600">
                                                        Aucun caissier
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <Button
                                        onClick={() => {
                                            setSelectedCounter(counter);
                                            setIsAssigningCashier(true);
                                        }}
                                        variant="outline"
                                        className="w-full rounded-xl border-slate-200 font-bold hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600"
                                    >
                                        {counter.cashier
                                            ? 'Changer le caissier'
                                            : 'Assigner un caissier'}
                                    </Button>

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4">
                                        <Badge
                                            className={`rounded-full px-2 py-1 text-xs font-black uppercase ${
                                                counter.is_active
                                                    ? 'bg-emerald-100 text-emerald-600'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {counter.is_active
                                                ? 'Actif'
                                                : 'Inactif'}
                                        </Badge>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-16 text-center">
                            <Store className="mb-4 h-16 w-16 text-slate-300" />
                            <h3 className="mb-2 text-xl font-black text-slate-900">
                                Aucun guichet configuré
                            </h3>
                            <p className="mb-6 text-slate-600">
                                Créez votre premier guichet pour commencer
                            </p>
                            <Button
                                onClick={() => setIsCreatingCounter(true)}
                                className="rounded-xl bg-indigo-600 font-bold"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Créer un guichet
                            </Button>
                        </div>
                    )}
                </div>

                {/* Advertisements Section */}
                <div className="mt-16">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">
                                Publicités
                            </h2>
                            <p className="text-sm text-slate-500">
                                Gérez les publicités affichées sur l'écran TV
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsCreatingAd(true)}
                            className="h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle Publicité
                        </Button>
                    </div>

                    {isLoadingAds ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-48 rounded-3xl"
                                />
                            ))}
                        </div>
                    ) : advertisements && advertisements.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {advertisements.map((ad, index) => (
                                <motion.div
                                    key={ad.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm transition-all hover:shadow-lg"
                                >
                                    {/* Media Preview */}
                                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100">
                                        {ad.image_url ? (
                                            ad.type === 'video' ? (
                                                <video
                                                    src={ad.image_url}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                    muted
                                                    loop
                                                    preload="metadata"
                                                    onMouseOver={(e) =>
                                                        (
                                                            e.target as HTMLVideoElement
                                                        ).play()
                                                    }
                                                    onMouseOut={(e) =>
                                                        (
                                                            e.target as HTMLVideoElement
                                                        ).pause()
                                                    }
                                                />
                                            ) : (
                                                <img
                                                    src={ad.image_url}
                                                    alt={ad.title}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                            )
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <ImageIcon className="h-16 w-16 text-indigo-300" />
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className="absolute top-4 right-4">
                                            <Badge
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-black uppercase',
                                                    ad.is_active
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-slate-100 text-slate-400',
                                                )}
                                            >
                                                {ad.is_active
                                                    ? 'Actif'
                                                    : 'Inactif'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <h3 className="mb-4 text-xl font-black text-slate-900">
                                            {ad.title}
                                        </h3>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() =>
                                                    toggleAdStatus(ad)
                                                }
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 rounded-xl font-bold"
                                            >
                                                {ad.is_active
                                                    ? 'Désactiver'
                                                    : 'Activer'}
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    handleDeleteAd(ad)
                                                }
                                                variant="ghost"
                                                size="sm"
                                                className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-16 text-center">
                            <ImageIcon className="mb-4 h-16 w-16 text-slate-300" />
                            <h3 className="mb-2 text-xl font-black text-slate-900">
                                Aucune publicité
                            </h3>
                            <p className="mb-6 text-slate-600">
                                Créez votre première publicité pour l'écran TV
                            </p>
                            <Button
                                onClick={() => setIsCreatingAd(true)}
                                className="rounded-xl bg-indigo-600 font-bold"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Créer une publicité
                            </Button>
                        </div>
                    )}
                    {/* News Ticker Section */}
                    <div className="mt-20 mb-20">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        Défilé d'Informations (Ticker)
                                    </h2>
                                    <Badge className="bg-indigo-100 text-[10px] font-black tracking-widest text-indigo-600 uppercase">
                                        Nouveau
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Gérez les messages qui défilent en bas de
                                    l'écran TV
                                </p>
                            </div>
                            <Button
                                onClick={() => setIsCreatingNews(true)}
                                className="h-12 rounded-2xl bg-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Ajouter une info
                            </Button>
                        </div>

                        {isLoadingNews ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton
                                        key={i}
                                        className="h-32 rounded-2xl"
                                    />
                                ))}
                            </div>
                        ) : allNews && allNews.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {allNews.map((news, index) => (
                                    <motion.div
                                        key={news.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                                    >
                                        <div className="mb-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                    Message #{index + 1}
                                                </span>
                                                <Badge
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-[9px] font-black uppercase',
                                                        news.is_active
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-slate-100 text-slate-400',
                                                    )}
                                                >
                                                    {news.is_active
                                                        ? 'Visible'
                                                        : 'Masqué'}
                                                </Badge>
                                            </div>
                                            <p className="line-clamp-3 text-sm font-bold text-slate-700">
                                                {news.content}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() =>
                                                    toggleNewsStatus(news)
                                                }
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 rounded-xl text-xs font-black"
                                            >
                                                {news.is_active
                                                    ? 'Masquer'
                                                    : 'Afficher'}
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    handleDeleteNews(news)
                                                }
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 rounded-xl p-0 text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center">
                                <Newspaper className="mb-4 h-12 w-12 text-slate-300" />
                                <h3 className="text-lg font-black text-slate-900">
                                    Aucun message défilant
                                </h3>
                                <p className="mb-6 text-sm text-slate-500">
                                    Ajoutez des informations ou des promotions
                                    qui défileront en bas de l'écran.
                                </p>
                                <Button
                                    onClick={() => setIsCreatingNews(true)}
                                    className="rounded-xl bg-indigo-600 px-6 font-bold"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Créer le premier message
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Create Advertisement Modal */}
                <Dialog open={isCreatingAd} onOpenChange={setIsCreatingAd}>
                    <DialogContent className="rounded-3xl sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">
                                Nouvelle Publicité
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateAd} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Titre de la publicité</Label>
                                    <Input
                                        value={adForm.title}
                                        onChange={(e) =>
                                            setAdForm({
                                                ...adForm,
                                                title: e.target.value,
                                            })
                                        }
                                        placeholder="ex: Promotion Spéciale"
                                        className="rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type de contenu</Label>
                                    <Select
                                        value={adForm.type}
                                        onValueChange={(value: any) =>
                                            setAdForm({
                                                ...adForm,
                                                type: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Choisir le type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="image">
                                                Image
                                            </SelectItem>
                                            <SelectItem value="video">
                                                Vidéo
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    {adForm.type === 'image'
                                        ? 'Image'
                                        : 'Vidéo'}
                                </Label>
                                <div className="space-y-4">
                                    <Input
                                        type="file"
                                        accept={
                                            adForm.type === 'image'
                                                ? 'image/*'
                                                : 'video/*'
                                        }
                                        onChange={
                                            adForm.type === 'image'
                                                ? handleImageChange
                                                : handleVideoChange
                                        }
                                        className="rounded-xl"
                                    />

                                    {adForm.type === 'image' &&
                                        imagePreview && (
                                            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-4">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="h-48 w-full rounded-xl object-cover"
                                                />
                                            </div>
                                        )}

                                    {adForm.type === 'video' &&
                                        videoPreview && (
                                            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-4">
                                                <video
                                                    src={videoPreview}
                                                    className="h-48 w-full rounded-xl object-cover"
                                                    controls
                                                />
                                            </div>
                                        )}

                                    {!imagePreview && !videoPreview && (
                                        <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                                            <div className="text-center">
                                                <ImageIcon className="mx-auto mb-2 h-12 w-12 text-slate-300" />
                                                <p className="text-sm text-slate-500">
                                                    Aucun fichier sélectionné
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreatingAd(false)}
                                    className="rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-xl bg-purple-600"
                                    disabled={
                                        createAdMutation.isPending ||
                                        (!imagePreview && !videoPreview)
                                    }
                                >
                                    {createAdMutation.isPending
                                        ? 'Création...'
                                        : 'Créer la publicité'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Create News Modal */}
                <Dialog open={isCreatingNews} onOpenChange={setIsCreatingNews}>
                    <DialogContent className="rounded-3xl sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">
                                Ajouter une Information
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateNews} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Message à faire défiler</Label>
                                <div className="relative">
                                    <textarea
                                        value={newsForm.content}
                                        onChange={(e) =>
                                            setNewsForm({
                                                ...newsForm,
                                                content: e.target.value,
                                            })
                                        }
                                        placeholder="ex: Bienvenue chez Havifin ! Profitez de nos taux exceptionnels aujourd'hui."
                                        className="min-h-[120px] w-full rounded-2xl border border-slate-200 p-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                        required
                                    />
                                    <div className="absolute top-4 right-4 text-slate-300">
                                        <Newspaper className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400">
                                    Ce message apparaîtra dans la barre
                                    défilante en bas de l'écran TV.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreatingNews(false)}
                                    className="rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-xl bg-indigo-600"
                                    disabled={
                                        createNewsMutation.isPending ||
                                        !newsForm.content
                                    }
                                >
                                    {createNewsMutation.isPending
                                        ? 'Ajout...'
                                        : 'Ajouter au défilé'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Create Cashier Modal */}
                <Dialog
                    open={isCreatingCashier}
                    onOpenChange={setIsCreatingCashier}
                >
                    <DialogContent className="rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">
                                Nouveau Caissier
                            </DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={handleCreateCashier}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label>Nom complet</Label>
                                <Input
                                    value={cashierForm.name}
                                    onChange={(e) =>
                                        setCashierForm({
                                            ...cashierForm,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="ex: Jean Dupont"
                                    className="rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={cashierForm.email}
                                    onChange={(e) =>
                                        setCashierForm({
                                            ...cashierForm,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="jean.dupont@example.com"
                                    className="rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mot de passe</Label>
                                <Input
                                    type="password"
                                    value={cashierForm.password}
                                    onChange={(e) =>
                                        setCashierForm({
                                            ...cashierForm,
                                            password: e.target.value,
                                        })
                                    }
                                    className="rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Assigner à un guichet (optionnel)</Label>
                                <Select
                                    value={cashierForm.counter_id}
                                    onValueChange={(value) =>
                                        setCashierForm({
                                            ...cashierForm,
                                            counter_id:
                                                value === 'none' ? '' : value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Choisir un guichet (optionnel)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Ne pas assigner pour le moment
                                        </SelectItem>
                                        {counters?.map((counter) => (
                                            <SelectItem
                                                key={counter.id}
                                                value={counter.id.toString()}
                                                disabled={!!counter.cashier_id}
                                                className={
                                                    counter.cashier_id
                                                        ? 'text-slate-400'
                                                        : ''
                                                }
                                            >
                                                {counter.counter_number} -{' '}
                                                {counter.name}
                                                {counter.cashier_id
                                                    ? ' (Occupé)'
                                                    : ' (Libre)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    Seuls les guichets libres peuvent être
                                    sélectionnés.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreatingCashier(false)}
                                    className="rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-xl bg-indigo-600"
                                    disabled={createCashierMutation.isPending}
                                >
                                    {createCashierMutation.isPending
                                        ? 'Création...'
                                        : 'Créer le caissier'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Create Counter Modal */}
                <Dialog
                    open={isCreatingCounter}
                    onOpenChange={setIsCreatingCounter}
                >
                    <DialogContent className="rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">
                                Nouveau Guichet
                            </DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={handleCreateCounter}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label>Numéro du Guichet</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={counterForm.counter_number}
                                    onChange={(e) =>
                                        setCounterForm({
                                            ...counterForm,
                                            counter_number: parseInt(
                                                e.target.value,
                                            ),
                                        })
                                    }
                                    className="rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nom du Guichet</Label>
                                <Input
                                    value={counterForm.name}
                                    onChange={(e) =>
                                        setCounterForm({
                                            ...counterForm,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="ex: Guichet Principal"
                                    className="rounded-xl"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreatingCounter(false)}
                                    className="rounded-xl"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-xl bg-indigo-600"
                                    disabled={createCounterMutation.isPending}
                                >
                                    {createCounterMutation.isPending
                                        ? 'Création...'
                                        : 'Créer'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Assign Cashier Modal */}
                <Dialog
                    open={isAssigningCashier}
                    onOpenChange={setIsAssigningCashier}
                >
                    <DialogContent className="rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">
                                Assigner un Caissier
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Sélectionner un caissier</Label>
                                <Select
                                    value={
                                        selectedCounter?.cashier_id?.toString() ||
                                        ''
                                    }
                                    onValueChange={(value) =>
                                        handleAssignCashier(
                                            value && value !== 'unassign'
                                                ? parseInt(value)
                                                : null,
                                        )
                                    }
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Choisir un caissier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassign">
                                            Aucun (désassigner)
                                        </SelectItem>
                                        {availableCashiers?.map((cashier) => (
                                            <SelectItem
                                                key={cashier.id}
                                                value={cashier.id.toString()}
                                            >
                                                {cashier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppMain>
    );
}
