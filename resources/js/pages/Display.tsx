import { base44, Client } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Users, Volume2 } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';

const serviceNames = {
    mpesa: 'M-Pesa',
    orange_money: 'Orange Money',
    airtel_money: 'Airtel Money',
    afrimoney: 'Afrimoney',
    rawbank: 'Rawbank',
    equity_bcdc: 'Equity BCDC',
    tmb: 'TMB',
    fbn_bank: 'FBN Bank',
};

export default function Display() {
    const [currentTime, setCurrentTime] = useState(moment());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(moment());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: calledClients = [] } = useQuery({
        queryKey: ['called-clients'],
        queryFn: () =>
            base44.entities.Client.filter(
                { status: 'called' },
                '-called_at',
                5,
            ),
        refetchInterval: 3000,
    });

    const { data: waitingClients = [] } = useQuery({
        queryKey: ['waiting-clients'],
        queryFn: () =>
            base44.entities.Client.filter(
                { status: 'waiting' },
                'created_date',
                10,
            ),
        refetchInterval: 3000,
    });

    const currentCalled = calledClients[0];

    // Voice Announcement Effect
    useEffect(() => {
        if (!currentCalled) {
            window.speechSynthesis.cancel();
            return;
        }

        const speak = () => {
            // Cancel any ongoing speech to prevent queue buildup
            window.speechSynthesis.cancel();

            const text = `Ticket ${currentCalled.ticket_number}`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR'; // Set to French
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1.1; // Slightly higher pitch for attention

            window.speechSynthesis.speak(utterance);
        };

        // Speak immediately when the ticket changes
        speak();

        // Repeat every 10 seconds
        const intervalId = setInterval(speak, 10000);

        return () => {
            clearInterval(intervalId);
            window.speechSynthesis.cancel();
        };
    }, [currentCalled?.id, currentCalled?.ticket_number]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0a0e27] via-[#1a1b41] to-[#0a0e27] text-white selection:bg-[#00e2f6] selection:text-[#1f61e4]">
            {/* Background Ambient Glow */}
            <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-[#1f61e4]/20 blur-[150px]" />
            <div className="pointer-events-none absolute right-[-10%] bottom-[-20%] h-[50%] w-[50%] rounded-full bg-[#bf15cf]/20 blur-[150px]" />

            {/* Header */}
            <div className="sticky top-0 z-50 border-b border-white/10 bg-white/5 px-10 py-6 backdrop-blur-md">
                <div className="mx-auto flex w-full items-center justify-between">
                    <div className="flex items-center gap-6">
                        <img
                            src="/logo.png"
                            alt="Havifin"
                            className="h-16 w-16 object-contain drop-shadow-[0_0_15px_rgba(31,97,228,0.5)]"
                        />
                        <div>
                            <h1 className="flex items-center gap-2 text-4xl font-black tracking-tight">
                                HAVIFIN{' '}
                                <span className="font-light text-[#00e2f6]">
                                    EXCHANGE
                                </span>
                            </h1>
                            <p className="text-lg font-light tracking-wider text-white/60">
                                Bienvenue - Karibu
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-3 text-[#00e2f6]">
                            <Clock className="h-8 w-8" />
                            <span className="font-mono text-5xl font-bold tracking-tight text-white drop-shadow-lg">
                                {currentTime.format('HH:mm')}
                            </span>
                        </div>
                        <p className="mt-1 text-base tracking-widest text-white/50 uppercase">
                            {currentTime.format('dddd, D MMMM YYYY')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid h-[calc(100vh-120px)] grid-cols-1 gap-8 p-8 lg:grid-cols-12">
                {/* Current Called Number */}
                <div className="flex flex-col gap-6 lg:col-span-8">
                    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-[#1f61e4] to-[#2000ff] p-12 shadow-[0_20px_60px_-15px_rgba(31,97,228,0.5)]">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00e2f6]/20 blur-3xl" />
                        <div className="absolute bottom-0 left-0 h-80 w-80 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#bf15cf]/30 blur-3xl" />

                        <div className="relative z-10 w-full">
                            <div className="absolute top-0 left-0">
                                <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/20 px-6 py-3 shadow-lg backdrop-blur-md">
                                    <Volume2 className="h-6 w-6 animate-pulse text-white" />
                                    <span className="text-sm font-bold tracking-widest text-white uppercase">
                                        En cours d'appel
                                    </span>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {currentCalled ? (
                                    <motion.div
                                        key={currentCalled.id}
                                        initial={{
                                            opacity: 0,
                                            scale: 0.9,
                                            y: 20,
                                        }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{
                                            opacity: 0,
                                            scale: 1.1,
                                            filter: 'blur(10px)',
                                        }}
                                        className="py-8 text-center"
                                    >
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.05, 1],
                                                textShadow: [
                                                    '0 0 20px rgba(255,255,255,0.2)',
                                                    '0 0 40px rgba(255,255,255,0.5)',
                                                    '0 0 20px rgba(255,255,255,0.2)',
                                                ],
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 3,
                                                ease: 'easeInOut',
                                            }}
                                            className="text-[14rem] leading-none font-black tracking-tighter text-white drop-shadow-2xl"
                                        >
                                            {currentCalled.ticket_number}
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="mt-8 inline-block rounded-2xl bg-black/20 px-8 py-3 text-4xl font-bold text-white/90 backdrop-blur-sm"
                                        >
                                            {currentCalled.phone}
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="mt-4 text-2xl text-[#00e2f6]"
                                        >
                                            {serviceNames[
                                                currentCalled.service as keyof typeof serviceNames
                                            ] || currentCalled.service}
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="py-16 text-center"
                                    >
                                        <div className="text-6xl font-black tracking-tight text-white/20">
                                            EN ATTENTE
                                        </div>
                                        <p className="mt-4 text-xl text-white/40">
                                            Veuillez patienter un instant
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Recently Called */}
                    {calledClients.length > 1 && (
                        <div className="flex h-48 flex-col justify-center rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl">
                            <h3 className="mb-4 flex items-center gap-2 px-2 text-lg text-xs font-bold tracking-widest text-white/50 uppercase">
                                <Clock className="h-4 w-4" />
                                Récemment appelés
                            </h3>
                            <div className="scrollbar-hide flex gap-6 overflow-x-auto pb-2">
                                {calledClients.slice(1).map((client) => (
                                    <motion.div
                                        key={client.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="min-w-[140px] flex-shrink-0 rounded-2xl border border-white/5 bg-white/5 px-8 py-4 text-center transition-colors hover:bg-white/10"
                                    >
                                        <div className="text-3xl font-black text-[#00e2f6]">
                                            {client.ticket_number}
                                        </div>
                                        <div className="mt-1 font-mono text-sm text-white/40">
                                            {client.phone.slice(-4)}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Waiting Queue */}
                <div className="relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl lg:col-span-4">
                    <div className="absolute top-0 right-0 h-2 w-full bg-gradient-to-r from-transparent via-[#00e2f6] to-transparent opacity-50" />

                    <div className="mb-8 flex items-center gap-4">
                        <div className="rounded-2xl bg-[#1f61e4] p-3 shadow-lg shadow-[#1f61e4]/40">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">
                                FILE D'ATTENTE
                            </h2>
                            <p className="text-sm font-medium text-[#00e2f6]">
                                {waitingClients.length} personnes en attente
                            </p>
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
                        <AnimatePresence>
                            {waitingClients.map(
                                (client: Client, index: number) => (
                                    <motion.div
                                        key={client.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex transform items-center justify-between rounded-2xl border-l-4 border-[#bf15cf] bg-gradient-to-r from-white/5 to-white/0 p-5 shadow-sm transition-transform hover:scale-[1.02] hover:from-white/10"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="font-mono text-3xl font-black tracking-tight text-white">
                                                {client.ticket_number}
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-white/90">
                                                    {client.phone}
                                                </div>
                                                <div className="mt-0.5 text-xs font-bold tracking-wider text-[#00e2f6] uppercase">
                                                    {serviceNames[
                                                        client.service as keyof typeof serviceNames
                                                    ] || client.service}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-white/20">
                                            #{index + 1}
                                        </div>
                                    </motion.div>
                                ),
                            )}
                        </AnimatePresence>

                        {waitingClients.length === 0 && (
                            <div className="flex flex-col items-center py-20 text-center text-white/20">
                                <Users className="mb-4 h-16 w-16 opacity-50" />
                                <p className="text-xl font-light">
                                    File d'attente vide
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
