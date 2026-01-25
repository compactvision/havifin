import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';

export default function NewsTicker() {
    const { data: news = [] } = useQuery({
        queryKey: ['active-news'],
        queryFn: () => base44.entities.News.active(),
        refetchInterval: 30000,
    });

    if (news.length === 0) return null;

    // Join all news with a separator
    const tickerText = news.map((item) => item.content).join('   •   ');

    return (
        <div className="flex w-full items-center gap-4 bg-slate-900 py-3 text-white">
            <div className="z-10 flex shrink-0 items-center gap-2 border-r border-white/10 bg-slate-900 px-6 font-black tracking-widest text-[#00e2f6] uppercase">
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
                    onUpdate={(latest: any) => {
                        // Logic to loop perfectly can be complex,
                        // for now we use a simple linear animation with a large offset.
                    }}
                >
                    <span className="inline-block pr-20">{tickerText}</span>
                    <span className="inline-block pr-20">{tickerText}</span>
                    <span className="inline-block pr-20">{tickerText}</span>
                </motion.div>
            </div>
            <div className="z-10 bg-slate-900 px-6 font-bold text-slate-400">
                {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                })}
            </div>
        </div>
    );
}
