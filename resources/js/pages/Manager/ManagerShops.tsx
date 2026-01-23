import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppMain from '@/layouts/app-main';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, MapPin, Store, Users } from 'lucide-react';

export default function ManagerShops() {
    const { auth } = usePage().props as any;
    const userId = auth.user?.id;

    const { data: allShops, isLoading } = useQuery({
        queryKey: ['shops'],
        queryFn: base44.entities.Shop.list,
    });

    // Filter shops where the current user is assigned
    const myShops = allShops?.filter((shop) =>
        shop.users?.some((user) => user.id === userId),
    );

    if (isLoading) {
        return (
            <AppMain currentPageName="Manager">
                <div className="flex h-screen items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                </div>
            </AppMain>
        );
    }

    return (
        <AppMain currentPageName="Manager">
            <Head title="Mes Boutiques" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-12 md:px-10">
                {/* Premium Header */}
                <header className="sticky top-0 z-50 mb-12 flex h-24 w-full flex-shrink-0 items-center justify-between border-b border-white/20 bg-white/70 px-6 shadow-sm backdrop-blur-xl md:px-10">
                    <div className="flex items-center gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="relative flex h-16 w-38 items-center justify-center px-4"
                        >
                            <img
                                src="/logo-color.png"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </motion.div>
                        <div className="h-10 w-[1px] bg-slate-100" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                    Console{' '}
                                    <span className="text-indigo-600">
                                        Manager
                                    </span>
                                </h1>
                                <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-600 uppercase">
                                    {myShops?.length || 0} Boutique
                                    {(myShops?.length || 0) > 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <p className="mt-1 flex items-center gap-2 text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
                                {auth.user.role} •{' '}
                                {auth.user.shop || 'Boutiques & Guichets'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden items-center gap-3 rounded-2xl border border-white/40 bg-white/40 p-1.5 pr-5 shadow-sm backdrop-blur-md transition-all hover:bg-white/60 xl:flex">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                    Personnel
                                </div>
                                <div className="text-xs font-bold text-slate-800">
                                    {auth.user.name}
                                </div>
                            </div>
                        </div>

                        <Link href="/manager">
                            <Button
                                variant="outline"
                                className="h-12 rounded-2xl border-white/40 bg-white/50 px-6 text-xs font-black tracking-widest uppercase shadow-sm backdrop-blur-md transition-all hover:border-indigo-500 hover:bg-white hover:text-indigo-600"
                            >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Dashboard
                            </Button>
                        </Link>
                    </div>
                </header>

                {/* Shop Grid */}
                {myShops && myShops.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {myShops.map((shop, index) => (
                            <motion.div
                                key={shop.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link href={`/manager/shops/${shop.id}`}>
                                    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10">
                                        {/* Gradient Background */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                                        {/* Content */}
                                        <div className="relative z-10">
                                            {/* Icon */}
                                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                                                <Building2 className="h-8 w-8 text-white" />
                                            </div>

                                            {/* Shop Name */}
                                            <h3 className="mb-2 text-2xl font-black text-slate-900">
                                                {shop.name}
                                            </h3>

                                            {/* Address */}
                                            {shop.address && (
                                                <div className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500">
                                                    <MapPin className="h-4 w-4" />
                                                    <span>{shop.address}</span>
                                                </div>
                                            )}

                                            {/* Stats */}
                                            <div className="mb-6 flex gap-4">
                                                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2">
                                                    <Store className="h-4 w-4 text-indigo-600" />
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {shop.counter_count}{' '}
                                                        guichets
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2">
                                                    <Users className="h-4 w-4 text-purple-600" />
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {shop.users?.length ||
                                                            0}{' '}
                                                        agents
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <Button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40">
                                                Gérer cette boutique
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Status Badge */}
                                        {shop.is_active && (
                                            <div className="absolute top-4 right-4">
                                                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black tracking-wider text-emerald-600 uppercase">
                                                    Active
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-16 text-center backdrop-blur-sm"
                    >
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                            <Building2 className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="mb-2 text-2xl font-black text-slate-900">
                            Aucune boutique assignée
                        </h3>
                        <p className="max-w-md text-slate-600">
                            Vous n'êtes actuellement assigné à aucune boutique.
                            Contactez votre administrateur pour obtenir un
                            accès.
                        </p>
                    </motion.div>
                )}
            </div>
        </AppMain>
    );
}
