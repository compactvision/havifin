import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatsCardProps {
    title: string;
    value: string | number | React.ReactNode;
    subtitle?: string;
    icon: React.ElementType;
    color: 'amber' | 'green' | 'blue' | 'purple' | string;
    trend?: number;
}

export default function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend,
}: StatsCardProps) {
    const colorClasses = {
        amber: 'from-amber-500 to-amber-600 shadow-amber-200',
        green: 'from-green-500 to-green-600 shadow-green-200',
        blue: 'from-[#1f61e4] to-[#2000ff] shadow-[#1f61e4]/30',
        purple: 'from-[#bf15cf] to-[#bf15cf] shadow-[#bf15cf]/30',
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-xl"
        >
            <div
                className={cn(
                    'absolute top-0 right-0 -mt-8 -mr-8 h-24 w-24 rounded-full opacity-5 transition-transform group-hover:scale-150',
                    color === 'blue'
                        ? 'bg-[#1f61e4]'
                        : color === 'purple'
                          ? 'bg-[#bf15cf]'
                          : `bg-${color}-500`,
                )}
            />

            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-400">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <p
                            className={cn(
                                'mt-2 text-sm font-medium',
                                trend > 0 ? 'text-green-500' : 'text-red-500',
                            )}
                        >
                            {trend > 0 ? '+' : ''}
                            {trend}% vs hier
                        </p>
                    )}
                </div>
                <div
                    className={cn(
                        'rounded-xl bg-gradient-to-br p-3 text-white shadow-lg',
                        colorClasses[color as keyof typeof colorClasses] ||
                            colorClasses.blue,
                    )}
                >
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </motion.div>
    );
}
