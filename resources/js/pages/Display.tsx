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
    Smartphone,
    Users,
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/fr';
import { useEffect, useRef, useState } from 'react';

moment.locale('fr');

export default function Display() {
    const [currentTime, setCurrentTime] = useState(moment());
    const lastCalledId = useRef<number | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(moment());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: calledClients = [] } = useQuery({
        queryKey: ['called-clients-display'],
        queryFn: async () => {
            // Fetch all called clients
            const clients = await base44.entities.Client.filter(
                { status: 'called' },
                '-called_at',
                20,
            );

            // Get the latest one for each counter (1 to 4)
            const counters = [1, 2, 3, 4]
                .map((num) => {
                    return clients.find((c) => c.counter_number === num);
                })
                .filter(Boolean) as Client[];

            return counters;
        },
        refetchInterval: 3000,
    });

    const { data: waitingClients = [] } = useQuery({
        queryKey: ['waiting-clients-display'],
        queryFn: () =>
            base44.entities.Client.filter(
                { status: 'waiting' },
                'created_date',
                12,
            ),
        refetchInterval: 3000,
    });

    const mostRecentCalled = calledClients.sort(
        (a, b) =>
            new Date(b.called_at!).getTime() - new Date(a.called_at!).getTime(),
    )[0];

    // Voice Announcement Effect
    useEffect(() => {
        if (!mostRecentCalled || mostRecentCalled.id === lastCalledId.current)
            return;

        lastCalledId.current = mostRecentCalled.id;

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

        // Repeat if it's still the same ticket after 15s
        const intervalId = setInterval(speak, 15000);
        return () => {
            clearInterval(intervalId);
            window.speechSynthesis.cancel();
        };
    }, [mostRecentCalled?.id]);

    return (
        <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#020617] text-white selection:bg-blue-500 selection:text-white">
            {/* Background Ambient Glows */}
            <div className="pointer-events-none absolute -top-[10%] -left-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-600/10 blur-[120px]" />
            <div className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-indigo-600/10 blur-[120px] delay-700" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[url('/grid.svg')] opacity-[0.03]" />

            {/* Header */}
            <header className="relative z-10 flex h-28 items-center justify-between border-b border-white/5 bg-slate-950/40 px-12 backdrop-blur-2xl">
                <div className="flex items-center gap-8">
                    <div className="relative">
                        <div className="absolute -inset-2 animate-pulse rounded-full bg-blue-500/20 blur-md" />
                        <img
                            src="/logo.png"
                            alt="Havifin"
                            className="relative h-16 w-16 object-contain drop-shadow-2xl"
                        />
                    </div>
                    <div>
                        <h1 className="flex items-center gap-3 text-5xl font-black tracking-tighter">
                            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                HAVIFIN
                            </span>
                            <span className="font-thin text-slate-700">|</span>
                            <span className="text-2xl font-bold tracking-[0.3em] text-slate-400 uppercase">
                                Smart Ticket
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-3 text-[#00e2f6]">
                            <span className="font-mono text-6xl font-black tracking-tight text-white tabular-nums">
                                {currentTime.format('HH:mm')}
                            </span>
                            <span className="mb-1 self-end font-mono text-3xl font-bold text-slate-500 tabular-nums">
                                {currentTime.format(':ss')}
                            </span>
                        </div>
                        <p className="mt-1 text-sm font-black tracking-[0.2em] text-slate-500 uppercase">
                            {currentTime.format('dddd D MMMM YYYY')}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="relative z-10 grid flex-1 grid-cols-12 gap-6 overflow-hidden p-6">
                {/* Left Side: Counters Grid */}
                <div className="col-span-8 flex h-full flex-col gap-6">
                    {/* Active Counters Grid */}
                    <div className="grid flex-1 grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((num) => {
                            const client = calledClients.find(
                                (c) => c.counter_number === num,
                            );
                            const isActive =
                                client?.id === mostRecentCalled?.id;

                            return (
                                <motion.div
                                    key={num}
                                    layout
                                    className={cn(
                                        'relative flex flex-col overflow-hidden rounded-[3rem] border transition-all duration-700',
                                        client
                                            ? isActive
                                                ? 'border-blue-500/50 bg-gradient-to-br from-blue-600 to-indigo-900 shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)]'
                                                : 'border-white/10 bg-white/5 backdrop-blur-xl'
                                            : 'border-dashed border-white/5 bg-slate-900/40',
                                    )}
                                >
                                    {/* Counter Label */}
                                    <div
                                        className={cn(
                                            'absolute top-6 left-6 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black tracking-widest uppercase',
                                            client
                                                ? isActive
                                                    ? 'border-white/20 bg-white/20 text-white'
                                                    : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                                : 'border-slate-700 bg-slate-800 text-slate-500',
                                        )}
                                    >
                                        <Monitor className="h-3 w-3" />
                                        Guichet {num}
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
                                                                    : 'bg-blue-500/10 text-blue-400',
                                                            )}
                                                        >
                                                            {client.first_name
                                                                ? `${client.first_name} ${client.last_name || ''}`
                                                                : client.phone}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
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
                                                <div className="mb-2 text-4xl font-black tracking-widest text-slate-500 uppercase">
                                                    Libre
                                                </div>
                                                <p className="font-bold text-slate-600">
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
                        <AdCarousel />
                    </div>
                </div>

                {/* Right Side: Waiting List */}
                <div className="shadow-3xl col-span-4 flex flex-col overflow-hidden rounded-[3rem] border border-white/10 bg-slate-950/60 backdrop-blur-3xl">
                    <div className="flex items-center justify-between border-b border-white/5 p-8">
                        <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-600/30">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">
                                    FILE D'ATTENTE
                                </h2>
                                <p className="text-sm font-bold tracking-wider text-blue-400">
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
                                        className="group relative flex items-center justify-between rounded-[2rem] border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/10"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-slate-800 font-mono text-2xl font-black text-blue-400">
                                                {client.ticket_number}
                                            </div>
                                            <div>
                                                <div className="mb-0.5 text-lg font-black text-slate-100">
                                                    {client.first_name ||
                                                        client.phone.slice(
                                                            0,
                                                            7,
                                                        ) + '***'}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
                                                    <ChevronRight className="h-3 w-3 text-blue-500" />
                                                    {client.service}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-mono text-sm font-black text-slate-700">
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
                    <div className="bg-white/5 p-4 text-center text-[10px] font-black tracking-[0.3em] text-slate-600 uppercase">
                        Veuillez surveiller l'affichage
                    </div>
                </div>
            </main>

            {/* Daily Rates Ticker */}
            <RateTicker />

            {/* Ambient Background Overlay (Vignette) */}
            <div className="bg-radial-vignette pointer-events-none absolute inset-0 z-50 opacity-40" />
        </div>
    );
}

// Tailscale classes (extended in css) or inline style for vignette if needed
