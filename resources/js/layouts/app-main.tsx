import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    Monitor,
    ShieldCheck,
    User,
    Wallet,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const navigation = [
    {
        name: 'Client',
        label: 'Client',
        icon: User,
        color: 'text-[#00e2f6]',
        bg: 'bg-[#00e2f6]/10',
    },
    {
        name: 'Display',
        label: 'Ecran',
        icon: Monitor,
        color: 'text-[#bf15cf]',
        bg: 'bg-[#bf15cf]/10',
    },
    {
        name: 'Cashier',
        label: 'Caissier',
        icon: Wallet,
        color: 'text-[#ff55ba]',
        bg: 'bg-[#ff55ba]/10',
    },
    {
        name: 'Manager',
        label: 'Manager',
        icon: LayoutDashboard,
        color: 'text-[#1f61e4]',
        bg: 'bg-[#1f61e4]/10',
    },
    {
        name: 'Admin',
        label: 'Super Admin',
        icon: ShieldCheck,
        color: 'text-[#4f46e5]',
        bg: 'bg-[#4f46e5]/10',
    },
];

export default function AppMain({ children, currentPageName }) {
    const { auth } = usePage().props as any;
    const userRole = auth.user?.role;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Filter navigation based on user role
    const filteredNavigation = useMemo(() => {
        return navigation.filter((item) => {
            if (item.name === 'Admin') return userRole === 'super-admin';
            if (item.name === 'Manager')
                return userRole === 'manager' || userRole === 'super-admin';
            return true;
        });
    }, [userRole]);

    const hideNav = currentPageName === 'Display';

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#1f61e4] selection:text-white">
            {/* Main Content Area - No Margin/Padding for Sidebar */}
            <main className="min-h-screen w-full">
                <motion.div
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
                <div className="fixed right-6 bottom-6 z-50">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMenuOpen(true)}
                        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#1f61e4] to-[#00e2f6] text-white shadow-lg shadow-blue-500/40 transition-all duration-300 hover:shadow-blue-500/60"
                    >
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 -z-10 rounded-full bg-blue-500 opacity-20 blur-lg transition-all duration-500 group-hover:opacity-40" />

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
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xl"
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
                            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white/90 p-8 shadow-2xl ring-1 ring-white/50 backdrop-blur-xl"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="absolute top-4 right-4 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <div className="mb-8 flex flex-col items-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100">
                                    <img
                                        src="/logo.png"
                                        alt="Havifin"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900">
                                    Navigation
                                </h2>
                                <p className="text-sm font-medium text-slate-500">
                                    Menu Principal
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {filteredNavigation.map((item, index) => {
                                    const isActive =
                                        currentPageName === item.name;
                                    return (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Link
                                                href={
                                                    item.name === 'Client'
                                                        ? '/'
                                                        : item.name === 'Admin'
                                                          ? '/admin/shops'
                                                          : `/${item.name.toLowerCase()}`
                                                }
                                                onClick={() =>
                                                    setIsMenuOpen(false)
                                                }
                                                className={cn(
                                                    'group flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02]',
                                                    isActive
                                                        ? 'border-blue-500 bg-blue-50/50 shadow-inner'
                                                        : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-lg',
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'rounded-xl p-3 transition-colors',
                                                        isActive
                                                            ? 'bg-blue-500 text-white'
                                                            : `${item.bg} ${item.color} group-hover:bg-blue-500 group-hover:text-white`,
                                                    )}
                                                >
                                                    <item.icon className="h-6 w-6" />
                                                </div>
                                                <span
                                                    className={cn(
                                                        'font-bold',
                                                        isActive
                                                            ? 'text-blue-900'
                                                            : 'text-slate-600',
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
                                className="mt-8 border-t border-slate-100 pt-6"
                            >
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="w-full justify-center gap-2 rounded-xl py-6 font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Déconnexion
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
