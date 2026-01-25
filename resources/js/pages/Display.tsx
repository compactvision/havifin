import { base44, Client } from '@/api/base44Client';
import AdCarousel from '@/components/display/AdCarousel';
import RateTicker from '@/components/display/RateTicker';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronRight,
    Landmark,
    Monitor,
    Moon,
    Smartphone,
    Sun,
    Users,
} from 'lucide-react';
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

    // Fetch shop counters to determine grid layout
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

        // Use a ref to store the last timestamp we announced
        const lastCalledTime = mostRecentCalled.called_at;

        // We only announce if the timestamp has changed (new call or recall)
        // or if it's the first time we see this client
        if (lastCalledId.current === mostRecentCalled.id + lastCalledTime)
            return;

        lastCalledId.current = mostRecentCalled.id + lastCalledTime;

        const speak = () => {
            window.speechSynthesis.cancel();

            const name = mostRecentCalled.first_name
                ? `, ${mostRecentCalled.first_name}`
                : '';
            const text = `Ticket ${mostRecentCalled.ticket_number}${name}, au guichet ${mostRecentCalled.counter_number}`;
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
                </div>
            </div>
        );
    }

    // Calculate grid layout based on counter count
    const counterCount = shopCounters.length;
    const gridCols =
        counterCount <= 2
            ? 1
            : counterCount <= 4
              ? 2
              : counterCount <= 6
                ? 3
                : 4;

    return (
        <div
            className={cn(
                'relative flex h-screen w-screen flex-col overflow-hidden transition-colors duration-500 selection:bg-blue-500 selection:text-white',
                isDarkMode
                    ? 'bg-[#020617] text-white'
                    : 'bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900',
            )}
        >
            {/* Background Ambient Glows */}
            {isDarkMode ? (
                <>
                    <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-600/10 blur-[120px]" />
                    <div className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-indigo-600/10 blur-[120px] delay-700" />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[url('/grid.svg')] opacity-[0.03]" />
                </>
            ) : (
                <>
                    <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-400/20 blur-[120px]" />
                    <div className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-indigo-400/20 blur-[120px] delay-700" />
                </>
            )}

            {/* Theme Toggle Button - Floating */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleDarkMode}
                className={cn(
                    'fixed top-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl transition-all duration-300',
                    isDarkMode
                        ? 'border-white/10 bg-white/10 text-yellow-400 hover:bg-white/20'
                        : 'border-slate-200 bg-white/80 text-indigo-600 hover:bg-white',
                )}
            >
                <AnimatePresence mode="wait">
                    {isDarkMode ? (
                        <motion.div
                            key="sun"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Sun className="h-6 w-6" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="moon"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Moon className="h-6 w-6" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Header */}
            <header
                className={cn(
                    'relative z-10 flex h-28 items-center justify-between border-b px-12 backdrop-blur-2xl transition-colors',
                    isDarkMode
                        ? 'border-white/5 bg-slate-950/40'
                        : 'border-slate-200/60 bg-white/60',
                )}
            >
                <div className="flex items-center gap-8">
                    <div className="relative">
                        <div
                            className={cn(
                                'absolute -inset-2 animate-pulse rounded-full blur-md',
                                isDarkMode
                                    ? 'bg-blue-500/20'
                                    : 'bg-blue-500/30',
                            )}
                        />
                        <img
                            src="/logo-color.png"
                            alt="Havifin"
                            className="relative h-16 w-16 object-contain drop-shadow-2xl"
                        />
                    </div>
                    <div>
                        <h1 className="flex items-center gap-3 text-5xl font-black tracking-tighter">
                            <span
                                className={cn(
                                    'bg-gradient-to-r bg-clip-text text-transparent',
                                    isDarkMode
                                        ? 'from-blue-400 to-indigo-400'
                                        : 'from-blue-600 to-indigo-600',
                                )}
                            >
                                HAVIFIN
                            </span>
                            <span
                                className={cn(
                                    'font-thin',
                                    isDarkMode
                                        ? 'text-slate-700'
                                        : 'text-slate-300',
                                )}
                            >
                                |
                            </span>
                            <span
                                className={cn(
                                    'text-2xl font-bold tracking-[0.3em] uppercase',
                                    isDarkMode
                                        ? 'text-slate-400'
                                        : 'text-slate-600',
                                )}
                            >
                                {shop?.name || 'Smart Ticket'}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-3 text-[#00e2f6]">
                            <span
                                className={cn(
                                    'font-mono text-6xl font-black tracking-tight tabular-nums',
                                    isDarkMode
                                        ? 'text-white'
                                        : 'text-slate-900',
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
                        <p
                            className={cn(
                                'mt-1 text-sm font-black tracking-[0.2em] uppercase',
                                isDarkMode
                                    ? 'text-slate-500'
                                    : 'text-slate-400',
                            )}
                        >
                            {currentTime.format('dddd D MMMM YYYY')}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="relative z-10 grid flex-1 grid-cols-12 gap-6 overflow-hidden p-6">
                {/* Left Side: Counters Grid */}
                <div className="col-span-8 flex h-full flex-col gap-6">
                    {/* Active Counters Grid - Dynamic */}
                    <div
                        className={cn(
                            'grid flex-1 gap-6',
                            gridCols === 1 && 'grid-cols-1',
                            gridCols === 2 && 'grid-cols-2',
                            gridCols === 3 && 'grid-cols-3',
                            gridCols === 4 && 'grid-cols-4',
                        )}
                    >
                        {shopCounters.map((counter, idx) => {
                            const client = calledClients.find(
                                (c) =>
                                    c.counter_number === counter.counter_number,
                            );
                            const isActive =
                                client?.id === mostRecentCalled?.id;

                            return (
                                <motion.div
                                    key={counter.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={cn(
                                        'relative flex flex-col overflow-hidden rounded-[3rem] border transition-all duration-700',
                                        client
                                            ? isActive
                                                ? isDarkMode
                                                    ? 'border-blue-500/50 bg-gradient-to-br from-blue-600 to-indigo-900 shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)]'
                                                    : 'border-blue-400/50 bg-gradient-to-br from-blue-500 to-indigo-700 shadow-[0_0_60px_-10px_rgba(59,130,246,0.5)]'
                                                : isDarkMode
                                                  ? 'border-white/10 bg-white/5 backdrop-blur-xl'
                                                  : 'border-slate-200 bg-white/80 backdrop-blur-xl'
                                            : isDarkMode
                                              ? 'border-dashed border-white/5 bg-slate-900/40'
                                              : 'border-dashed border-slate-200 bg-slate-50/40',
                                    )}
                                >
                                    {/* Counter Label */}
                                    <div
                                        className={cn(
                                            'absolute top-6 left-6 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black tracking-widest uppercase',
                                            client
                                                ? isActive
                                                    ? 'border-white/20 bg-white/20 text-white'
                                                    : isDarkMode
                                                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                                      : 'border-blue-400/30 bg-blue-400/10 text-blue-600'
                                                : isDarkMode
                                                  ? 'border-slate-700 bg-slate-800 text-slate-500'
                                                  : 'border-slate-300 bg-slate-200 text-slate-400',
                                        )}
                                    >
                                        <Monitor className="h-3 w-3" />
                                        Guichet {counter.counter_number}
                                    </div>

                                    {client ? (
                                        <div className="flex flex-1 flex-col items-center justify-center p-8">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={client.id}
                                                    initial={{
                                                        opacity: 0,
                                                        scale: 0.8,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        scale: 1,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        scale: 1.1,
                                                    }}
                                                    className="text-center"
                                                >
                                                    <motion.div
                                                        animate={
                                                            isActive
                                                                ? {
                                                                      scale: [
                                                                          1,
                                                                          1.05,
                                                                          1,
                                                                      ],
                                                                      textShadow:
                                                                          [
                                                                              '0 0 0px #fff',
                                                                              '0 0 40px rgba(255,255,255,0.4)',
                                                                              '0 0 0px #fff',
                                                                          ],
                                                                  }
                                                                : {}
                                                        }
                                                        transition={{
                                                            repeat: Infinity,
                                                            duration: 2,
                                                        }}
                                                        className="mb-4 text-[9rem] leading-none font-black tracking-tighter"
                                                    >
                                                        {client.ticket_number}
                                                    </motion.div>

                                                    <div className="flex flex-col items-center gap-4">
                                                        <div
                                                            className={cn(
                                                                'rounded-2xl px-6 py-2 text-xl font-bold backdrop-blur-md',
                                                                isActive
                                                                    ? 'bg-white/10 text-white'
                                                                    : isDarkMode
                                                                      ? 'bg-blue-500/10 text-blue-400'
                                                                      : 'bg-blue-500/20 text-blue-700',
                                                            )}
                                                        >
                                                            {client.first_name
                                                                ? `${client.first_name} ${client.last_name || ''}`
                                                                : client.phone}
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                'flex items-center gap-2 text-xs font-bold tracking-widest uppercase',
                                                                isDarkMode
                                                                    ? 'text-slate-400'
                                                                    : 'text-slate-500',
                                                            )}
                                                        >
                                                            {client.operation_type ===
                                                            'change' ? (
                                                                <Landmark className="h-4 w-4" />
                                                            ) : (
                                                                <Smartphone className="h-4 w-4" />
                                                            )}
                                                            {client.service}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <div className="flex flex-1 items-center justify-center p-8 opacity-20">
                                            <div className="text-center">
                                                <div
                                                    className={cn(
                                                        'mb-2 text-4xl font-black tracking-widest uppercase',
                                                        isDarkMode
                                                            ? 'text-slate-500'
                                                            : 'text-slate-400',
                                                    )}
                                                >
                                                    Libre
                                                </div>
                                                <p
                                                    className={cn(
                                                        'font-bold',
                                                        isDarkMode
                                                            ? 'text-slate-600'
                                                            : 'text-slate-500',
                                                    )}
                                                >
                                                    En attente d'appel
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pulse effect for most recent */}
                                    {isActive && (
                                        <div className="pointer-events-none absolute inset-0 animate-ping rounded-[3rem] border-4 border-blue-400/50 opacity-20" />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Bottom Area: Ads */}
                    <div className="mb-1 h-64">
                        <AdCarousel isDarkMode={isDarkMode} />
                    </div>
                </div>

                {/* Right Side: Waiting List */}
                <div
                    className={cn(
                        'shadow-3xl col-span-4 flex flex-col overflow-hidden rounded-[3rem] border backdrop-blur-3xl',
                        isDarkMode
                            ? 'border-white/10 bg-slate-950/60'
                            : 'border-slate-200 bg-white/60',
                    )}
                >
                    <div
                        className={cn(
                            'flex items-center justify-between border-b p-8',
                            isDarkMode ? 'border-white/5' : 'border-slate-200',
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className={cn(
                                    'rounded-2xl p-3 shadow-lg',
                                    isDarkMode
                                        ? 'bg-blue-600 shadow-blue-600/30'
                                        : 'bg-blue-500 shadow-blue-500/30',
                                )}
                            >
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">
                                    FILE D'ATTENTE
                                </h2>
                                <p
                                    className={cn(
                                        'text-sm font-bold tracking-wider',
                                        isDarkMode
                                            ? 'text-blue-400'
                                            : 'text-blue-600',
                                    )}
                                >
                                    {waitingClients.length} EN ATTENTE
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-2">
                        <div className="space-y-4 py-4">
                            <AnimatePresence>
                                {waitingClients.map((client, idx) => (
                                    <motion.div
                                        key={client.id}
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            'group relative flex items-center justify-between rounded-[2rem] border p-5 transition-all',
                                            isDarkMode
                                                ? 'border-white/5 bg-white/5 hover:bg-white/10'
                                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                                        )}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div
                                                className={cn(
                                                    'flex h-14 w-14 items-center justify-center rounded-2xl border font-mono text-2xl font-black shadow-sm',
                                                    isDarkMode
                                                        ? 'border-white/5 bg-slate-800 text-blue-400'
                                                        : 'border-slate-200 bg-white text-blue-600',
                                                )}
                                            >
                                                {client.ticket_number}
                                            </div>
                                            <div>
                                                <div
                                                    className={cn(
                                                        'mb-0.5 text-lg font-black',
                                                        isDarkMode
                                                            ? 'text-slate-100'
                                                            : 'text-slate-900',
                                                    )}
                                                >
                                                    {client.first_name ||
                                                        client.phone.slice(
                                                            0,
                                                            7,
                                                        ) + '***'}
                                                </div>
                                                <div
                                                    className={cn(
                                                        'flex items-center gap-1 text-[10px] font-black tracking-[0.2em] uppercase',
                                                        isDarkMode
                                                            ? 'text-slate-500'
                                                            : 'text-slate-400',
                                                    )}
                                                >
                                                    <ChevronRight
                                                        className={cn(
                                                            'h-3 w-3',
                                                            isDarkMode
                                                                ? 'text-blue-500'
                                                                : 'text-blue-600',
                                                        )}
                                                    />
                                                    {client.service}
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                'font-mono text-sm font-black',
                                                isDarkMode
                                                    ? 'text-slate-700'
                                                    : 'text-slate-400',
                                            )}
                                        >
                                            #{idx + 1}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {waitingClients.length === 0 && (
                                <div className="flex h-full flex-col items-center justify-center py-20 opacity-20">
                                    <Users className="mb-4 h-16 w-16" />
                                    <p className="text-xl font-bold tracking-widest uppercase">
                                        File Vide
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Status bar for waiting list */}
                    <div
                        className={cn(
                            'p-4 text-center text-[10px] font-black tracking-[0.3em] uppercase',
                            isDarkMode
                                ? 'bg-white/5 text-slate-600'
                                : 'bg-slate-100 text-slate-500',
                        )}
                    >
                        Veuillez surveiller l'affichage
                    </div>
                </div>
            </main>

            {/* Daily Rates Ticker */}
            <div className="relative z-10 w-full">
                <RateTicker isDarkMode={isDarkMode} />
                <NewsTicker />
            </div>

            {/* Ambient Background Overlay (Vignette) */}
            <div className="bg-radial-vignette pointer-events-none absolute inset-0 z-50 opacity-40" />
        </div>
    );
}
