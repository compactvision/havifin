import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    Monitor,
    ShieldCheck,
    Store,
    User,
    Users, // Added
    Wallet,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Toaster } from 'sonner';

const navigation = [
    {
        name: 'Client',
        label: 'Client',
        icon: User,
        color: 'text-brand-cyan',
        bg: 'bg-brand-cyan/10',
        route: '/clientform',
    },
    {
        name: 'Display',
        label: 'Ecran',
        icon: Monitor,
        color: 'text-brand-purple',
        bg: 'bg-brand-purple/10',
        route: '/display',
    },
    {
        name: 'Cashier',
        label: 'Guichet', // Was Caissier, now Guichet for clarity (Client Calling)
        icon: Users, // Distinct icon
        color: 'text-brand-orange',
        bg: 'bg-brand-orange/10',
        route: '/cashier',
    },
    {
        name: 'CashMoney', // Newitem for Cash Management
        label: 'Caisse',
        icon: Wallet,
        color: 'text-brand-pink',
        bg: 'bg-brand-pink/10',
        route: '/cash/dashboard',
    },
    {
        name: 'Manager',
        label: 'Manager',
        icon: LayoutDashboard,
        color: 'text-brand-blue',
        bg: 'bg-brand-blue/10',
        route: '/manager',
    },
    {
        name: 'ManagerShops',
        label: 'Boutique',
        icon: Store,
        color: 'text-brand-cyan',
        bg: 'bg-brand-cyan/10',
        route: '/manager/shops',
    },
    {
        name: 'Admin',
        label: 'Mes Boutiques',
        icon: ShieldCheck,
        color: 'text-brand-deep',
        bg: 'bg-brand-deep/10',
        route: '/admin/shops',
    },
];

export default function AppMain({ children, currentPageName }: any) {
    const { auth } = usePage().props as any;
    const userRole = auth.user?.role;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Filter navigation based on user role
    const filteredNavigation = useMemo(() => {
        if (userRole === 'super-admin') {
            return navigation.filter((item) => item.name === 'Admin');
        }

        if (userRole === 'manager') {
            return navigation.filter((item) =>
                ['Display', 'Manager', 'ManagerShops'].includes(item.name),
            );
        }

        if (userRole === 'cashier') {
            return navigation.filter((item) =>
                ['Cashier', 'CashMoney', 'Display'].includes(item.name),
            );
        }

        return navigation.filter((item) => item.name === 'Client');
    }, [userRole]);

    const hideNav =
        (currentPageName === 'Display' && userRole !== 'manager') ||
        (currentPageName === 'Client' && userRole === 'client');

    return (
        <div className="brand-canvas min-h-screen font-sans text-brand-dark selection:bg-brand-blue selection:text-white">
            {/* Main Content Area - No Margin/Padding for Sidebar */}
            <main className="min-h-screen w-full">
                <motion.div
                    key={currentPageName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full"
                >
                    {children}
                </motion.div>
            </main>

            {/* Floating Action Button (FAB) */}
            {!hideNav && (
                <div className="fixed right-5 bottom-5 z-50 sm:right-7 sm:bottom-7">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMenuOpen(true)}
                        className="group relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/30 bg-gradient-to-br from-brand-deep via-brand-blue to-brand-purple text-white shadow-[0_18px_42px_rgba(32,0,255,0.35)] transition-all duration-300 hover:shadow-[0_22px_52px_rgba(32,0,255,0.48)]"
                        aria-label="Ouvrir la navigation"
                    >
                        <div className="absolute -inset-2 -z-10 rounded-[1.8rem] bg-brand-cyan/20 blur-xl transition-all duration-500 group-hover:bg-brand-pink/25" />
                        <Menu className="h-8 w-8" />
                    </motion.button>
                </div>
            )}

            {/* Full Screen Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b0754]/70 p-4 backdrop-blur-xl"
                    >
                        {/* Close Button Area - Click outside to close */}
                        <div
                            className="absolute inset-0"
                            onClick={() => setIsMenuOpen(false)}
                        />

                        {/* Menu Card */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{
                                type: 'spring',
                                damping: 25,
                                stiffness: 300,
                            }}
                            className="brand-hero relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] p-7 text-white shadow-[0_40px_120px_rgba(13,0,109,0.45)] ring-1 ring-white/20 sm:p-9"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="absolute top-5 right-5 z-20 rounded-xl border border-white/15 bg-white/10 p-2 text-white/70 backdrop-blur-xl transition-colors hover:bg-white/20 hover:text-white"
                                aria-label="Fermer la navigation"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <div className="mb-8 flex flex-col items-center">
                                <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20">
                                    <img
                                        src="/logo-color.png"
                                        alt="Havifin"
                                        className="brand-logo-crop h-full w-full object-contain"
                                    />
                                </div>
                                <p className="mb-2 text-[10px] font-black tracking-[0.26em] text-brand-cyan uppercase">
                                    Finance en mouvement
                                </p>
                                <h2 className="brand-title text-3xl text-white">
                                    Navigation
                                </h2>
                                <p className="mt-1 text-sm font-medium text-white/55">
                                    {userRole === 'super-admin'
                                        ? 'Administration des boutiques'
                                        : 'Menu Principal'}
                                </p>
                            </div>

                            <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {filteredNavigation.map((item, index) => {
                                    const isActive =
                                        currentPageName === item.name;
                                    return (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={cn(
                                                filteredNavigation.length ===
                                                    1 && 'sm:col-span-2',
                                            )}
                                        >
                                            <Link
                                                href={item.route}
                                                onClick={() =>
                                                    setIsMenuOpen(false)
                                                }
                                                className={cn(
                                                    'group flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-white backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]',
                                                    isActive
                                                        ? 'border-white/30 bg-white/20 shadow-inner'
                                                        : 'border-white/12 bg-white/8 hover:border-white/25 hover:bg-white/15',
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'rounded-xl p-3 transition-colors',
                                                        isActive
                                                            ? 'bg-white text-brand-blue'
                                                            : 'bg-white/12 text-brand-cyan group-hover:bg-white group-hover:text-brand-blue',
                                                    )}
                                                >
                                                    <item.icon className="h-6 w-6" />
                                                </div>
                                                <span
                                                    className={cn(
                                                        'font-bold',
                                                        isActive
                                                            ? 'text-white'
                                                            : 'text-white/75 group-hover:text-white',
                                                    )}
                                                >
                                                    {item.label}
                                                </span>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="relative z-10 mt-7 border-t border-white/12 pt-5"
                            >
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="w-full justify-center gap-2 rounded-xl py-6 font-bold text-white/65 hover:bg-white/10 hover:text-brand-pink"
                                >
                                    <Link
                                        href={logout()}
                                        as="button"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            router.flushAll();
                                        }}
                                        data-test="main-menu-logout-button"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Déconnexion
                                    </Link>
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Toaster
                theme="light"
                position="top-right"
                expand={true}
                richColors={true}
            />
        </div>
    );
}
