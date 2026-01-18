import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    ArrowDownCircle,
    ArrowLeftRight,
    ArrowUpCircle,
    CreditCard,
} from 'lucide-react';

const operations = [
    {
        id: 'change',
        name: 'Change Devises',
        icon: ArrowLeftRight,
        description: 'USD ↔ CDF au meilleur taux',
        color: 'from-amber-400 to-orange-500',
        hover: 'shadow-orange-200',
    },
    {
        id: 'depot',
        name: 'Dépôt Cash',
        icon: ArrowDownCircle,
        description: 'Alimentez vos comptes',
        color: 'from-green-400 to-emerald-600',
        hover: 'shadow-green-200',
    },
    {
        id: 'retrait',
        name: 'Retrait Cash',
        icon: ArrowUpCircle,
        description: 'Retirez vos fonds',
        color: 'from-blue-400 to-indigo-600',
        hover: 'shadow-blue-200',
    },
    {
        id: 'paiement',
        name: 'Paiement',
        icon: CreditCard,
        description: 'Payez vos factures et services',
        color: 'from-purple-400 to-pink-600',
        hover: 'shadow-purple-200',
    },
];

export default function OperationSelector({
    selectedOperation,
    onSelect,
}: {
    selectedOperation: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {operations.map((op) => {
                const Icon = op.icon;
                const isSelected = selectedOperation === op.id;

                return (
                    <motion.button
                        key={op.id}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(op.id)}
                        className={cn(
                            'group relative overflow-hidden rounded-[40px] border-4 p-8 text-center transition-all duration-300',
                            isSelected
                                ? 'border-blue-500 bg-white shadow-2xl shadow-blue-500/20'
                                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white hover:shadow-xl',
                        )}
                    >
                        {/* Background Gradient Circle on Hover/Select */}
                        <div
                            className={cn(
                                'absolute -top-12 -right-12 h-24 w-24 rounded-full blur-[40px] transition-opacity',
                                isSelected
                                    ? 'opacity-20'
                                    : 'opacity-0 group-hover:opacity-10',
                                op.color.replace('from-', 'bg-'),
                            )}
                        />

                        <div
                            className={cn(
                                'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br shadow-lg transition-transform group-hover:rotate-6',
                                op.color,
                                isSelected ? 'scale-110' : '',
                            )}
                        >
                            <Icon className="h-10 w-10 text-white" />
                        </div>

                        <h3
                            className={cn(
                                'mb-2 text-xl font-black transition-colors',
                                isSelected
                                    ? 'text-slate-900'
                                    : 'text-slate-700',
                            )}
                        >
                            {op.name}
                        </h3>

                        <p className="text-sm font-medium text-slate-400 group-hover:text-slate-500">
                            {op.description}
                        </p>

                        {isSelected && (
                            <motion.div
                                layoutId="op-indicator"
                                className="absolute bottom-4 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-blue-500"
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
