import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react';

export default function RateTicker() {
    const { data: rates = [] } = useQuery({
        queryKey: ['active-rates'],
        queryFn: () => base44.entities.ExchangeRateHistory.active(),
        refetchInterval: 30000, // Refresh rates every 30 seconds
    });

    if (rates.length === 0) return null;

    // Duplicate rates for infinite scroll effect
    const displayRates = [...rates, ...rates, ...rates];

    return (
        <div className="relative flex h-20 w-full items-center overflow-hidden border-t border-white/5 bg-slate-900">
            <div className="pointer-events-none absolute left-0 z-20 h-full w-40 bg-gradient-to-r from-slate-900 to-transparent" />
            <div className="pointer-events-none absolute right-0 z-20 h-full w-40 bg-gradient-to-l from-slate-900 to-transparent" />

            <div className="relative z-30 flex h-full items-center gap-8 overflow-hidden bg-blue-600 px-8 pl-10 whitespace-nowrap shadow-xl">
                <ArrowRightLeft className="h-6 w-6 text-white" />
                <span className="text-xl font-black tracking-widest text-white uppercase">
                    Taux du Jour
                </span>
                {/* Decorative slant */}
                <div className="absolute top-0 -right-4 h-full w-8 skew-x-[-20deg] bg-blue-600" />
            </div>

            <motion.div
                animate={{ x: [0, -100 * rates.length] }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: 'linear',
                }}
                className="flex items-center gap-16 px-10"
            >
                {displayRates.map((rate, idx) => (
                    <div
                        key={`${rate.id}-${idx}`}
                        className="flex items-center gap-4"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white">
                                {rate.currency_from}
                            </span>
                            <ArrowRightLeft className="h-4 w-4 text-[#00e2f6]" />
                            <span className="text-2xl font-black text-[#00e2f6]">
                                {rate.currency_to}
                            </span>
                        </div>
                        <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 transition-colors hover:border-[#00e2f6]/50">
                            <span className="font-mono text-3xl font-black text-white">
                                {rate.rate}
                            </span>
                            {rate.rate > 2400 ? (
                                <TrendingUp className="h-5 w-5 animate-bounce text-emerald-400" />
                            ) : (
                                <TrendingDown className="h-5 w-5 animate-bounce text-rose-400" />
                            )}
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
