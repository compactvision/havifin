import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

export default function AdCarousel() {
    const { data: ads = [] } = useQuery({
        queryKey: ['active-ads'],
        queryFn: () => base44.entities.Advertisement.active(),
        refetchInterval: 60000, // Refresh ads list every minute
    });

    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        if (ads.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, 8000); // Change ad every 8 seconds

        return () => clearInterval(timer);
    }, [ads.length]);

    if (ads.length === 0) return null;

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <AnimatePresence mode="wait">
                <motion.div
                    key={ads[currentIndex].id}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0"
                >
                    <img
                        src={ads[currentIndex].image_url}
                        alt={ads[currentIndex].title}
                        className="h-full w-full object-cover"
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-10">
                        <motion.h3
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-4xl font-black tracking-tight text-white drop-shadow-lg"
                        >
                            {ads[currentIndex].title}
                        </motion.h3>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Pagination Indicators */}
            {ads.length > 1 && (
                <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                    {ads.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                idx === currentIndex
                                    ? 'w-8 bg-[#00e2f6]'
                                    : 'w-2 bg-white/30'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
