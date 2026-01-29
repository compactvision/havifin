import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';

interface NewsTickerProps {
    isDarkMode?: boolean;
}

export default function NewsTicker({ isDarkMode = true }: NewsTickerProps) {
    const { data: news = [] } = useQuery({
        queryKey: ['active-news'],
        queryFn: () => base44.entities.News.active(),
        refetchInterval: 30000,
    });

    if (news.length === 0) return null;

    // Join all news with a separator
    const tickerText = news.map((item) => item.content).join('   •   ');

    return (
        <div
            className={cn(
                'flex w-full items-center gap-4 py-3',
                isDarkMode
                    ? 'bg-slate-900 text-white'
                    : 'border-t border-slate-200 bg-white text-slate-800',
            )}
        >
            <div
                className={cn(
                    'z-10 flex shrink-0 items-center gap-2 border-r px-6 font-black tracking-widest uppercase',
                    isDarkMode
                        ? 'border-white/10 bg-slate-900 text-[#00e2f6]'
                        : 'border-slate-200 bg-white text-blue-600',
                )}
            >
                <Newspaper className="h-4 w-4" />
                <span>Havifin News</span>
            </div>
            <div className="relative flex-1 overflow-hidden">
                <motion.div
                    animate={{ x: [0, -2000] }}
                    transition={{
                        duration: 40,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="text-lg font-bold tracking-wide whitespace-nowrap"
                >
                    <span className="inline-block pr-20">{tickerText}</span>
                    <span className="inline-block pr-20">{tickerText}</span>
                    <span className="inline-block pr-20">{tickerText}</span>
                </motion.div>
            </div>
            <div
                className={cn(
                    'z-10 px-6 font-bold',
                    isDarkMode
                        ? 'bg-slate-900 text-slate-400'
                        : 'bg-white text-slate-500',
                )}
            >
                {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                })}
            </div>
        </div>
    );
}
