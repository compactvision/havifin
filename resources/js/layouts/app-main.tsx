import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronRight,
    LayoutDashboard,
    LogOut,
    Menu,
    Monitor,
    User,
    Wallet,
    X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
    { name: 'Client', label: 'Client', icon: User, color: 'text-[#00e2f6]' },
    { name: 'Display', label: 'Ecran', icon: Monitor, color: 'text-[#bf15cf]' },
    {
        name: 'Cashier',
        label: 'Caissier',
        icon: Wallet,
        color: 'text-[#ff55ba]',
    },
    {
        name: 'Manager',
        label: 'Manager',
        icon: LayoutDashboard,
        color: 'text-[#1f61e4]',
    },
];

export default function AppMain({ children, currentPageName }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

            // Redirect to login page
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            // Redirect anyway
            window.location.href = '/login';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#1f61e4] selection:text-white">
            {/* Sidebar Navigation - Desktop */}
            {/* Sidebar Navigation - Desktop (Fixed on XL) */}
            {!hideNav && (
                <aside className="fixed top-0 left-0 z-40 hidden h-screen w-20 flex-col items-center justify-between border-r border-[#1f61e4]/10 bg-white/80 py-8 backdrop-blur-xl xl:flex">
                    <Link href="/" className="mb-8">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 10,
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100"
                        >
                            <img
                                src="/logo.png"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </motion.div>
                    </Link>

                    <nav className="flex flex-col gap-6">
                        {navigation.map((item) => {
                            const isActive = currentPageName === item.name;
                            return (
                                <Link
                                    key={item.name}
                                    href={
                                        item.name === 'Client'
                                            ? '/'
                                            : `/${item.name.toLowerCase()}`
                                    }
                                    className="group relative flex items-center justify-center"
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavDesktop"
                                            className="absolute inset-0 rounded-2xl bg-[#1f61e4]/10"
                                            initial={false}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 30,
                                            }}
                                        />
                                    )}
                                    <div
                                        className={cn(
                                            'relative z-10 rounded-2xl p-3 transition-all duration-300',
                                            isActive
                                                ? item.color
                                                : 'text-slate-400 group-hover:scale-110 group-hover:text-[#1f61e4]',
                                        )}
                                    >
                                        <item.icon
                                            className="h-6 w-6"
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                    </div>

                                    {/* Tooltip */}
                                    <span className="absolute left-16 z-50 ml-2 rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="rounded-xl p-3 text-slate-400 transition-colors duration-300 hover:bg-red-50 hover:text-[#dd281c]"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </aside>
            )}

            {/* Floating Menu Button - Tablet/Mobile */}
            {!hideNav && (
                <div className="fixed top-6 right-6 z-50 xl:hidden">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f61e4] text-white shadow-lg shadow-blue-500/30"
                    >
                        {isSidebarOpen ? <X /> : <Menu />}
                    </motion.button>
                </div>
            )}

            {/* Slide-over Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{
                                type: 'spring',
                                damping: 25,
                                stiffness: 200,
                            }}
                            className="fixed top-0 right-0 z-50 h-screen w-80 border-l border-[#1f61e4]/10 bg-white p-8 shadow-2xl xl:hidden"
                        >
                            <div className="mb-12 flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100">
                                    <img
                                        src="/logo.png"
                                        alt="Havifin"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Havifin
                                    </h2>
                                    <p className="text-[10px] font-black tracking-widest text-[#1f61e4] uppercase">
                                        Navigation
                                    </p>
                                </div>
                            </div>

                            <nav className="flex flex-col gap-4">
                                {navigation.map((item) => {
                                    const isActive =
                                        currentPageName === item.name;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={
                                                item.name === 'Client'
                                                    ? '/'
                                                    : `/${item.name.toLowerCase()}`
                                            }
                                            onClick={() =>
                                                setIsSidebarOpen(false)
                                            }
                                            className={cn(
                                                'group relative flex items-center justify-between rounded-2xl border p-4 transition-all duration-300',
                                                isActive
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                    : 'border-transparent hover:bg-slate-50',
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={cn(
                                                        'rounded-xl p-2',
                                                        isActive
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-slate-100 text-slate-400',
                                                    )}
                                                >
                                                    <item.icon className="h-5 w-5" />
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
                                            </div>
                                            {isActive && (
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="absolute right-8 bottom-10 left-8">
                                <Button
                                    variant="outline"
                                    className="h-14 w-full rounded-2xl border-red-100 font-bold text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    <LogOut className="mr-3 h-5 w-5" />
                                    Déconnexion
                                </Button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main
                className={cn(
                    'min-h-screen transition-all duration-300',
                    !hideNav && 'xl:pl-20',
                )}
            >
                {/* Mobile Header - Visible only on small screens */}
                {!hideNav && (
                    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1f61e4]/10 bg-white/80 px-6 py-4 backdrop-blur-md md:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 shadow-blue-500/5 ring-slate-100">
                            <img
                                src="/logo.svg"
                                alt="Havifin"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <button className="rounded-full bg-[#1f61e4]/5 p-2 text-[#1f61e4]">
                            <LayoutDashboard className="h-5 w-5" />
                        </button>
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full"
                >
                    {children}
                </motion.div>

                {/* Mobile Bottom Navigation */}
                {!hideNav && (
                    <div className="fixed right-4 bottom-4 left-4 z-40 md:hidden">
                        <nav className="flex items-center justify-around rounded-3xl border border-white/20 bg-white/90 p-2 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
                            {navigation.map((item) => {
                                const isActive = currentPageName === item.name;
                                return (
                                    <Link
                                        key={item.name}
                                        href={
                                            item.name === 'Client'
                                                ? '/'
                                                : `/${item.name.toLowerCase()}`
                                        }
                                        className="relative flex flex-1 flex-col items-center justify-center p-2"
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeNavMobile"
                                                className="absolute inset-0 rounded-2xl bg-[#1f61e4]/10"
                                                initial={false}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 500,
                                                    damping: 30,
                                                }}
                                            />
                                        )}
                                        <item.icon
                                            className={cn(
                                                'relative z-10 h-6 w-6 transition-colors duration-300',
                                                isActive
                                                    ? item.color
                                                    : 'text-slate-400',
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                'relative z-10 mt-1 text-[10px] font-medium transition-colors duration-300',
                                                isActive
                                                    ? 'text-slate-900'
                                                    : 'text-slate-400',
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </main>
        </div>
    );
}
