import { base44, Client } from '@/api/base44Client';
import AdCarousel from '@/components/display/AdCarousel';
import NewsTicker from '@/components/display/NewsTicker';
import RateTicker from '@/components/display/RateTicker';
import { cn } from '@/lib/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Monitor, Users } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/fr';
import { useEffect, useRef, useState } from 'react';

moment.locale('fr');

export default function Display() {
    const [currentTime, setCurrentTime] = useState(moment());
    const lastCalledId = useRef<number | null>(null);
    const [shopId, setShopId] = useState<number | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Initialize dark mode from localStorage
    useEffect(() => {
        const storedTheme = localStorage.getItem('havifin_display_theme');
        if (storedTheme) {
            setIsDarkMode(storedTheme === 'dark');
        }
    }, []);

    // Toggle dark mode
    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem(
            'havifin_display_theme',
            newMode ? 'dark' : 'light',
        );
    };

    // Initialize shop ID from URL param or localStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlShopId = params.get('shop_id');
        const storedShopId = localStorage.getItem('havifin_display_shop_id');

        if (urlShopId) {
            const id = parseInt(urlShopId);
            setShopId(id);
            localStorage.setItem('havifin_display_shop_id', id.toString());
            // Clear URL param to clean up address bar
            window.history.replaceState({}, '', '/display');
        } else if (storedShopId) {
            setShopId(parseInt(storedShopId));
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(moment());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch shop counters
    const { data: shopCounters = [] } = useQuery({
        queryKey: ['shop-counters', shopId],
        queryFn: () =>
            shopId ? base44.entities.Counter.list(shopId) : Promise.resolve([]),
        enabled: !!shopId,
    });

    const { data: calledClients = [] } = useQuery({
        queryKey: ['called-clients-display', shopId],
        queryFn: async () => {
            if (!shopId) return [];

            const counterNumbers = shopCounters.map((c) => c.counter_number);

            const clients = await base44.entities.Client.filter(
                { status: 'called' },
                '-called_at',
                50,
            );

            const shopClients = clients.filter((c) =>
                counterNumbers.includes(c.counter_number || -1),
            );

            const activeDisplayCounters = shopCounters
                .map((c) => c.counter_number)
                .sort();

            const clientsForDisplay = activeDisplayCounters
                .map((num) => {
                    return shopClients.find((c) => c.counter_number === num);
                })
                .filter(Boolean) as Client[];

            return clientsForDisplay;
        },
        enabled: !!shopId && shopCounters.length > 0,
        refetchInterval: 3000,
    });

    const { data: waitingClients = [] } = useQuery({
        queryKey: ['waiting-clients-display', shopId],
        queryFn: async () => {
            if (!shopId) return [];

            return base44.entities.Client.filter(
                { status: 'waiting' },
                'created_date',
                12,
            );
        },
        enabled: !!shopId,
        refetchInterval: 3000,
    });

    const { data: shop } = useQuery({
        queryKey: ['shop', shopId],
        queryFn: () =>
            shopId
                ? base44.entities.Shop.list().then((shops) =>
                      shops.find((s) => s.id === shopId),
                  )
                : null,
        enabled: !!shopId,
    });

    const mostRecentCalled = calledClients.sort(
        (a, b) =>
            new Date(b.called_at!).getTime() - new Date(a.called_at!).getTime(),
    )[0];

    // Voice Announcement Effect
    useEffect(() => {
        if (!mostRecentCalled) return;

        const lastCalledTime = mostRecentCalled.called_at;

        if (lastCalledId.current === mostRecentCalled.id + lastCalledTime)
            return;

        lastCalledId.current = mostRecentCalled.id + lastCalledTime;

        const speak = () => {
            window.speechSynthesis.cancel();

            // Privacy: Call ONLY the ticket number, no names
            const text = `Ticket ${mostRecentCalled.ticket_number}, au guichet ${mostRecentCalled.counter_number}`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR';
            utterance.rate = 0.85;
            utterance.pitch = 1;

            window.speechSynthesis.speak(utterance);
        };

        speak();

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [mostRecentCalled?.id, mostRecentCalled?.called_at]);

    const { auth } = usePage().props as any;
    const canConfigure =
        auth.user?.role === 'manager' || auth.user?.role === 'super-admin';
    const configLink =
        auth.user?.role === 'super-admin' ? '/admin/shops' : '/manager/shops';

    if (!shopId) {
        return (
            <div
                className={cn(
                    'flex h-screen items-center justify-center transition-colors duration-500',
                    isDarkMode
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-50 text-slate-900',
                )}
            >
                {/* ... (Keep existing Not Configured UI) ... */}
                <div className="text-center">
                    <Monitor
                        className={cn(
                            'mx-auto mb-6 h-20 w-20',
                            isDarkMode ? 'text-slate-700' : 'text-slate-300',
                        )}
                    />
                    <h1
                        className={cn(
                            'text-3xl font-black',
                            isDarkMode ? 'text-slate-200' : 'text-slate-800',
                        )}
                    >
                        Écran Non Configuré
                    </h1>
                    <p
                        className={cn(
                            'mt-4 max-w-md',
                            isDarkMode ? 'text-slate-500' : 'text-slate-600',
                        )}
                    >
                        Cet écran n'est associé à aucune boutique.
                        <br />
                        Veuillez utiliser le bouton{' '}
                        <strong>"Lancer l'écran TV"</strong> depuis le tableau
                        de bord Manager pour configurer cet affichage.
                    </p>

                    {canConfigure && (
                        <div className="mt-8">
                            <Link href={configLink}>
                                <button className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black tracking-widest text-white uppercase shadow-xl transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95">
                                    Configurer l'Affichage
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'relative flex h-screen w-screen flex-col overflow-hidden transition-colors duration-500 selection:bg-blue-500 selection:text-white',
                isDarkMode
                    ? 'bg-brand-dark text-white'
                    : 'bg-gradient-to-br from-brand-white via-white to-brand-blue/10 text-brand-dark',
            )}
        >
            <Head title="Affichage" />  
            {/* Background Ambient Glows */}
            {isDarkMode ? (
                <>
                    <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-brand-blue/20 blur-[120px]" />
                    <div className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-indigo-600/10 blur-[120px] delay-700" />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[url('/grid.svg')] opacity-[0.03]" />
                </>
            ) : (
                <>
                    <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-400/20 blur-[120px]" />
                    <div className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-indigo-400/20 blur-[120px] delay-700" />
                </>
            )}

            {/* Theme Toggle - Hidden but accessible top right */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={toggleDarkMode}
                className="fixed top-2 right-2 z-50 p-2 opacity-0 hover:opacity-100"
            >
                {/* Hidden toggle for manual override */}
            </motion.button>

            {/* Top Header - Compact */}
            <header
                className={cn(
                    'relative z-10 flex h-20 items-center justify-between border-b px-8 backdrop-blur-2xl transition-colors',
                    isDarkMode
                        ? 'border-white/5 bg-brand-dark/40'
                        : 'border-slate-200/60 bg-white/60',
                )}
            >
                <div className="flex items-center gap-4">
                    <img
                        src="/logo-color.png"
                        alt="Havifin"
                        className="h-10 w-auto object-contain drop-shadow-2xl"
                    />
                    <div className="h-6 w-px bg-current opacity-20" />
                    <h1 className="text-xl font-bold tracking-widest uppercase opacity-80">
                        {shop?.name || 'Smart Ticket'}
                    </h1>
                </div>

                <div className="text-right">
                    <div className="flex items-center justify-end gap-3 text-brand-cyan">
                        {/* Live Badge */}
                        <div
                            className={cn(
                                'mr-4 flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase',
                                isDarkMode
                                    ? 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan'
                                    : 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
                            )}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan"></span>
                            </span>
                            LIVE
                        </div>

                        <span
                            className={cn(
                                'font-mono text-6xl font-black tracking-tight tabular-nums',
                                isDarkMode ? 'text-white' : 'text-slate-900',
                            )}
                        >
                            {currentTime.format('HH:mm')}
                        </span>
                        <span
                            className={cn(
                                'mb-1 self-end font-mono text-3xl font-bold tabular-nums',
                                isDarkMode
                                    ? 'text-slate-500'
                                    : 'text-slate-400',
                            )}
                        >
                            {currentTime.format(':ss')}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Layout Area */}
            <main className="relative z-10 flex flex-1 gap-6 overflow-hidden p-6 py-4">
                {/* 1. ADVERTISING AREA - DOMINANT (75% Width) */}
                <div className="relative flex h-full flex-[3] flex-col overflow-hidden rounded-[2rem] border shadow-2xl transition-all">
                    <div className="absolute inset-0">
                        <AdCarousel isDarkMode={isDarkMode} />
                    </div>
                </div>

                {/* 2. RIGHT SIDEBAR - UPDATES & WAITING (25% Width) */}
                <div className="flex min-w-[350px] flex-1 flex-col gap-4">
                    {/* CURRENT CALL - HERO BOX */}
                    <div
                        className={cn(
                            'relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border p-6 shadow-2xl',
                            isDarkMode
                                ? 'border-blue-500/30 bg-gradient-to-br from-blue-900/40 to-slate-900/90 backdrop-blur-xl'
                                : 'border-blue-200 bg-white/80 backdrop-blur-xl',
                        )}
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 h-full w-full -translate-x-1/2 animate-pulse rounded-full bg-blue-500/20 blur-[100px]" />

                        <div className="relative z-10 w-full text-center">
                            <h2
                                className={cn(
                                    'mb-4 text-sm font-black tracking-[0.3em] uppercase',
                                    isDarkMode
                                        ? 'text-brand-cyan'
                                        : 'text-brand-blue',
                                )}
                            >
                                Appel En Cours
                            </h2>

                            <AnimatePresence mode="wait">
                                {mostRecentCalled ? (
                                    <motion.div
                                        key={mostRecentCalled.id}
                                        initial={{
                                            scale: 0.8,
                                            opacity: 0,
                                            y: 20,
                                        }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 1.1, opacity: 0 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div
                                            className={cn(
                                                'mb-4 text-[5rem] leading-none font-black tracking-tighter tabular-nums',
                                                isDarkMode
                                                    ? 'text-white drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]'
                                                    : 'text-slate-900',
                                            )}
                                        >
                                            {mostRecentCalled.ticket_number}
                                        </div>

                                        <div
                                            className={cn(
                                                'flex items-center gap-2 rounded-full border px-6 py-3 backdrop-blur-md',
                                                isDarkMode
                                                    ? 'border-white/10 bg-white/10 text-white'
                                                    : 'border-transparent bg-brand-blue text-white shadow-lg',
                                            )}
                                        >
                                            <Monitor className="h-5 w-5" />
                                            <span className="text-xl font-bold tracking-widest uppercase">
                                                Guichet{' '}
                                                {
                                                    mostRecentCalled.counter_number
                                                }
                                            </span>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="opacity-50"
                                    >
                                        <div className="text-6xl font-black tracking-widest text-slate-500">
                                            --
                                        </div>
                                        <div className="mt-2 text-sm font-bold tracking-widest text-slate-500 uppercase">
                                            En attente
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* WAITING LIST - COMPACT */}
                    <div
                        className={cn(
                            'flex flex-1 flex-col overflow-hidden rounded-[2.5rem] border',
                            isDarkMode
                                ? 'border-white/10 bg-brand-dark/60 backdrop-blur-xl'
                                : 'border-slate-200 bg-white/60 backdrop-blur-xl',
                        )}
                    >
                        <div
                            className={cn(
                                'flex items-center gap-3 border-b px-6 py-4',
                                isDarkMode
                                    ? 'border-white/5'
                                    : 'border-slate-100',
                            )}
                        >
                            <Users
                                className={cn(
                                    'h-5 w-5',
                                    isDarkMode
                                        ? 'text-slate-400'
                                        : 'text-slate-500',
                                )}
                            />
                            <span
                                className={cn(
                                    'text-xs font-black tracking-[0.2em] uppercase',
                                    isDarkMode
                                        ? 'text-slate-400'
                                        : 'text-slate-500',
                                )}
                            >
                                En Attente ({waitingClients.length})
                            </span>
                        </div>

                        <div className="scrollbar-none flex-1 space-y-3 overflow-y-auto p-4">
                            <AnimatePresence>
                                {waitingClients
                                    .slice(0, 5)
                                    .map((client, idx) => (
                                        <motion.div
                                            key={client.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={cn(
                                                'flex items-center justify-between rounded-2xl border p-3',
                                                isDarkMode
                                                    ? 'border-white/5 bg-white/5'
                                                    : 'border-slate-100 bg-white shadow-sm',
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        'flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black',
                                                        isDarkMode
                                                            ? 'bg-slate-800 text-blue-400'
                                                            : 'bg-blue-50 text-blue-600',
                                                    )}
                                                >
                                                    {client.ticket_number}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span
                                                        className={cn(
                                                            'text-[10px] font-bold tracking-wider uppercase',
                                                            isDarkMode
                                                                ? 'text-slate-500'
                                                                : 'text-slate-400',
                                                        )}
                                                    >
                                                        Ticket
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className={cn(
                                                    'flex items-center gap-1 text-xs font-bold uppercase',
                                                    isDarkMode
                                                        ? 'text-slate-400'
                                                        : 'text-slate-500',
                                                )}
                                            >
                                                <ChevronRight className="h-3 w-3" />
                                                {client.service}
                                            </div>
                                        </motion.div>
                                    ))}
                            </AnimatePresence>
                            {waitingClients.length === 0 && (
                                <div className="flex h-full items-center justify-center opacity-30">
                                    <span className="text-xs font-black tracking-widest uppercase">
                                        Aucune attente
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* BOTTOM CASHIER STATUS BAR */}
            <div className="px-6 pb-2">
                <div
                    className={cn(
                        'scrollbar-hide mask-gradient-x flex items-center gap-4 overflow-x-auto rounded-2xl p-3',
                        isDarkMode
                            ? 'border border-white/5 bg-white/5'
                            : 'border border-slate-200 bg-white/80',
                    )}
                >
                    <div
                        className={cn(
                            'shrink-0 px-3 text-xs font-black tracking-widest uppercase',
                            isDarkMode ? 'text-slate-500' : 'text-slate-400',
                        )}
                    >
                        Statut des guichets
                    </div>
                    {/* Status Items */}
                    {shopCounters.map((counter) => {
                        const client = calledClients.find(
                            (c) => c.counter_number === counter.counter_number,
                        );
                        const isActive = client?.id === mostRecentCalled?.id;

                        return (
                            <motion.div
                                key={counter.id}
                                layout
                                className={cn(
                                    'flex shrink-0 items-center gap-3 rounded-xl border px-4 py-2 transition-all',
                                    isActive
                                        ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : isDarkMode
                                          ? 'border-white/5 bg-slate-800/50 text-slate-400'
                                          : 'border-slate-200 bg-white text-slate-600',
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">
                                        Guichet
                                    </span>
                                    <span className="text-lg leading-none font-black">
                                        {counter.counter_number}
                                    </span>
                                </div>
                                <div className="h-8 w-px bg-current opacity-20" />
                                <div className="flex min-w-[3rem] flex-col items-end">
                                    {client ? (
                                        <>
                                            <span className="text-sm font-black tracking-tight">
                                                {client.ticket_number}
                                            </span>
                                            <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">
                                                En cours
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-black tracking-widest uppercase opacity-50">
                                            Libre
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Daily Rates Ticker */}
            <div className="relative z-10 mb-0 w-full shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                <RateTicker isDarkMode={isDarkMode} />
                <NewsTicker isDarkMode={isDarkMode} />
            </div>

            {/* Ambient Background Overlay (Vignette) */}
            <div className="bg-radial-vignette pointer-events-none absolute inset-0 z-50 opacity-40" />
        </div>
    );
}
