import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Monitor, User, Wallet } from 'lucide-react';

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
    const hideNav = currentPageName === 'Display';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#1f61e4] selection:text-white">
            {/* Sidebar Navigation - Desktop */}
            {!hideNav && (
                <aside className="fixed top-0 left-0 z-40 hidden h-screen w-20 flex-col items-center justify-between border-r border-[#1f61e4]/10 bg-white/80 py-8 backdrop-blur-xl md:flex">
                    <Link href="/" className="mb-8">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 10,
                            }}
                        >
                            <img
                                src="/logo.png"
                                alt="Havifin"
                                className="h-10 w-10 object-contain drop-shadow-lg"
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

                    <button className="rounded-xl p-3 text-slate-400 transition-colors duration-300 hover:bg-red-50 hover:text-[#dd281c]">
                        <LogOut className="h-5 w-5" />
                    </button>
                </aside>
            )}

            {/* Main Content Area */}
            <main
                className={cn(
                    'min-h-screen transition-all duration-300',
                    !hideNav && 'md:pl-20',
                )}
            >
                {/* Mobile Header - Visible only on small screens */}
                {!hideNav && (
                    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1f61e4]/10 bg-white/80 px-6 py-4 backdrop-blur-md md:hidden">
                        <img
                            src="/logo.png"
                            alt="Havifin"
                            className="h-8 w-8 object-contain"
                        />
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
