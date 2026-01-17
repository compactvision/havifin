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

const colorConfigs = {
    blue: {
        bg: 'bg-blue-50',
        icon: 'bg-blue-600 text-white shadow-blue-200',
        text: 'text-blue-600',
        border: 'border-blue-100',
        accent: 'bg-blue-600/5',
        glow: 'shadow-blue-500/10',
    },
    emerald: {
        bg: 'bg-emerald-50',
        icon: 'bg-emerald-600 text-white shadow-emerald-200',
        text: 'text-emerald-600',
        border: 'border-emerald-100',
        accent: 'bg-emerald-600/5',
        glow: 'shadow-emerald-500/10',
    },
    amber: {
        bg: 'bg-amber-50',
        icon: 'bg-amber-500 text-white shadow-amber-200',
        text: 'text-amber-600',
        border: 'border-amber-100',
        accent: 'bg-amber-600/5',
        glow: 'shadow-amber-500/10',
    },
    indigo: {
        bg: 'bg-indigo-50',
        icon: 'bg-indigo-600 text-white shadow-indigo-200',
        text: 'text-indigo-600',
        border: 'border-indigo-100',
        accent: 'bg-indigo-600/5',
        glow: 'shadow-indigo-500/10',
    },
    purple: {
        bg: 'bg-purple-50',
        icon: 'bg-purple-600 text-white shadow-purple-200',
        text: 'text-purple-600',
        border: 'border-purple-100',
        accent: 'bg-purple-600/5',
        glow: 'shadow-purple-500/10',
    },
    rose: {
        bg: 'bg-rose-50',
        icon: 'bg-rose-600 text-white shadow-rose-200',
        text: 'text-rose-600',
        border: 'border-rose-100',
        accent: 'bg-rose-600/5',
        glow: 'shadow-rose-500/10',
    },
};

export default function StatsCard({
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
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
                'group relative overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-xl backdrop-blur-xl transition-all',
                config.glow,
            )}
        >
            {/* Decorative Pulse Background */}
            <div
                className={cn(
                    'absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-3xl',
                    config.bg,
                )}
            />

            <div className="relative z-10 flex h-full flex-col">
                <div className="mb-8 flex items-center justify-between">
                    <div
                        className={cn(
                            'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110',
                            config.icon,
                        )}
                    >
                        <Icon className="h-8 w-8" />
                    </div>
                    {trend && (
                        <div
                            className={cn(
                                'flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase',
                                trend.positive
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-rose-100 text-rose-600',
                            )}
                        >
                            {trend.positive ? '↑' : '↓'} {trend.value}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                        {title}
                    </p>
                    <h2 className="text-3xl leading-tight font-black tracking-tight text-slate-900">
                        {value}
                    </h2>
                    {subtitle && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                            <span
                                className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    config.text.replace('text', 'bg'),
                                )}
                            />
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Glow Bar */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 h-1.5 w-full opacity-30',
                    config.text.replace('text', 'bg'),
                )}
            />
        </motion.div>
    );
}
