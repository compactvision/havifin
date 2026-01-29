import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react';

interface RateTickerProps {
    isDarkMode?: boolean;
}

export default function RateTicker({ isDarkMode = true }: RateTickerProps) {
    const { data: rates = [] } = useQuery({
        queryKey: ['active-rates'],
        queryFn: () => base44.entities.ExchangeRateHistory.active(),
        refetchInterval: 30000,
    });

    if (rates.length === 0) return null;

    // Duplicate rates for infinite scroll effect
    const displayRates = [...rates, ...rates, ...rates];

    return (
        <div
            className={cn(
                'relative flex h-20 w-full items-center overflow-hidden border-t',
                isDarkMode
                    ? 'border-white/5 bg-brand-dark/80 backdrop-blur-md'
                    : 'border-slate-200 bg-white/80 backdrop-blur-md',
            )}
        >
            {/* Gradient masks */}
            <div
                className={cn(
                    'pointer-events-none absolute left-0 z-20 h-full w-40 bg-gradient-to-r',
                    isDarkMode
                        ? 'from-brand-dark to-transparent'
                        : 'from-white to-transparent',
                )}
            />
            <div
                className={cn(
                    'pointer-events-none absolute right-0 z-20 h-full w-40 bg-gradient-to-l',
                    isDarkMode
                        ? 'from-brand-dark to-transparent'
                        : 'from-white to-transparent',
                )}
            />

            <div
                className={cn(
                    'relative z-30 flex h-full items-center gap-8 overflow-hidden px-8 pl-10 whitespace-nowrap shadow-xl',
                    isDarkMode ? 'bg-brand-blue' : 'bg-brand-blue',
                )}
            >
                <ArrowRightLeft className="h-6 w-6 text-white" />
                <span className="text-xl font-black tracking-widest text-white uppercase">
                    Taux du Jour
                </span>
                {/* Decorative slant */}
                <div
                    className={cn(
                        'absolute top-0 -right-4 h-full w-8 skew-x-[-20deg]',
                        isDarkMode ? 'bg-brand-blue' : 'bg-brand-blue',
                    )}
                />
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
                            <span
                                className={cn(
                                    'text-2xl font-black',
                                    isDarkMode
                                        ? 'text-white'
                                        : 'text-slate-800',
                                )}
                            >
                                {rate.currency_from}
                            </span>
                            <ArrowRightLeft
                                className={cn(
                                    'h-4 w-4',
                                    isDarkMode
                                        ? 'text-brand-cyan'
                                        : 'text-brand-blue',
                                )}
                            />
                            <span
                                className={cn(
                                    'text-2xl font-black',
                                    isDarkMode
                                        ? 'text-brand-cyan'
                                        : 'text-brand-blue',
                                )}
                            >
                                {rate.currency_to}
                            </span>
                        </div>
                        <div
                            className={cn(
                                'group flex items-center gap-3 rounded-2xl border px-6 py-3 transition-colors',
                                isDarkMode
                                    ? 'border-white/10 bg-white/5 hover:border-brand-cyan/50'
                                    : 'border-slate-200 bg-white hover:border-brand-blue',
                            )}
                        >
                            <span
                                className={cn(
                                    'font-mono text-3xl font-black',
                                    isDarkMode
                                        ? 'text-white'
                                        : 'text-slate-900',
                                )}
                            >
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
