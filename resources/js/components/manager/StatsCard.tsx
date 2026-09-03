import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface StatsCardProps {
    title: string;
    value: React.ReactNode;
    subtitle?: string;
    icon: LucideIcon;
    color: 'blue' | 'emerald' | 'amber' | 'indigo' | 'purple' | 'rose';
    trend?: {
        value: string;
        positive: boolean;
    };
}

// Every class is spelled out rather than derived at runtime: Tailwind only
// generates what it can see in the source, so building names on the fly
// (e.g. text-blue-600 -> bg-blue-600) silently yields unstyled elements.
const colorConfigs = {
    blue: {
        icon: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25',
        wash: 'from-blue-500/10',
        dot: 'bg-blue-500',
        ring: 'group-hover:border-blue-200',
    },
    emerald: {
        icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25',
        wash: 'from-emerald-500/10',
        dot: 'bg-emerald-500',
        ring: 'group-hover:border-emerald-200',
    },
    amber: {
        icon: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/25',
        wash: 'from-amber-500/10',
        dot: 'bg-amber-500',
        ring: 'group-hover:border-amber-200',
    },
    indigo: {
        icon: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/25',
        wash: 'from-indigo-500/10',
        dot: 'bg-indigo-500',
        ring: 'group-hover:border-indigo-200',
    },
    purple: {
        icon: 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/25',
        wash: 'from-purple-500/10',
        dot: 'bg-purple-500',
        ring: 'group-hover:border-purple-200',
    },
    rose: {
        icon: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25',
        wash: 'from-rose-500/10',
        dot: 'bg-rose-500',
        ring: 'group-hover:border-rose-200',
    },
};

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend,
}: StatsCardProps) {
    const config = colorConfigs[color] || colorConfigs.blue;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={cn(
                'group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition-[box-shadow,border-color] duration-300 hover:shadow-lg hover:shadow-slate-900/5',
                config.ring,
            )}
        >
            {/* Soft corner wash, tinted per metric */}
            <div
                className={cn(
                    'pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br to-transparent blur-2xl',
                    config.wash,
                )}
            />

            <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between">
                    <div
                        className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-105',
                            config.icon,
                        )}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                    {trend && (
                        <div
                            className={cn(
                                'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide',
                                trend.positive
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600',
                            )}
                        >
                            {trend.positive ? '↑' : '↓'} {trend.value}
                        </div>
                    )}
                </div>

                <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                    {title}
                </p>
                <h2 className="mt-1.5 text-3xl leading-none font-bold tracking-tight text-slate-900 tabular-nums">
                    {value}
                </h2>
                {subtitle && (
                    <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span
                            className={cn(
                                'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                                config.dot,
                            )}
                        />
                        {subtitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
