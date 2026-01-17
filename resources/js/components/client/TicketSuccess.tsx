import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, RefreshCw, Ticket } from 'lucide-react';

interface TicketSuccessProps {
    ticketNumber: string | null;
    onNewTicket: () => void;
}

export default function TicketSuccess({
    ticketNumber,
    onNewTicket,
}: TicketSuccessProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
        >
            <div className="relative mb-12">
                {/* Animated rings */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: 'easeOut',
                    }}
                    className="absolute inset-0 rounded-full bg-green-500/20"
                />
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[36px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-2xl shadow-green-500/30"
                >
                    <CheckCircle2 className="h-14 w-14 text-white" />
                </motion.div>
            </div>

            <h2 className="mb-2 text-4xl font-black tracking-tight text-slate-900">
                C'est fait !
            </h2>
            <p className="mb-10 text-xl font-medium text-slate-500">
                Votre ticket a été généré avec succès
            </p>

            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="group relative mx-auto max-w-sm overflow-hidden rounded-[40px] bg-slate-900 p-10 shadow-2xl"
            >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/5 blur-2xl transition-transform group-hover:scale-150" />
                <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-8 translate-y-8 rounded-full bg-blue-500/10 blur-xl" />

                <div className="relative z-10">
                    <div className="mb-6 flex items-center justify-center gap-3 text-amber-400">
                        <Ticket className="h-6 w-6 rotate-12" />
                        <span className="text-sm font-black tracking-[0.2em] uppercase">
                            Ticket No.
                        </span>
                    </div>

                    <div className="mb-8 font-mono text-7xl font-black tracking-tighter text-white">
                        {ticketNumber}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm font-bold text-slate-400">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>Attendez d'être appelé sur l'écran</span>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12"
            >
                <Button
                    onClick={onNewTicket}
                    className="h-14 rounded-2xl border-none bg-slate-100 px-10 font-black tracking-tight text-slate-900 shadow-none transition-all hover:scale-105 hover:bg-slate-200 active:scale-95"
                >
                    <RefreshCw className="mr-2 h-5 w-5 text-blue-500" />
                    Nouvelle opération
                </Button>
            </motion.div>
        </motion.div>
    );
}
