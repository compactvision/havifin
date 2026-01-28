import { Institution } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Globe, Smartphone } from 'lucide-react';
import React, { useEffect } from 'react';
import InstitutionSelector from './InstitutionSelector';

const categories = [
    {
        id: 'mobile_money',
        name: 'Mobile Money',
        icon: Smartphone,
        color: 'text-emerald-500',
    },
    { id: 'bank', name: 'Banques', icon: Building2, color: 'text-blue-500' },
    {
        id: 'payment',
        name: 'Services de Paiement',
        icon: Globe,
        color: 'text-indigo-500',
    },
    { id: 'other', name: 'Autres', icon: Globe, color: 'text-amber-500' },
];

interface ServiceSelectorProps {
    institutions: Institution[];
    selectedId?: number;
    onSelect: (id: number) => void;
    isLoading?: boolean;
    operationType?: string;
}

export default function ServiceSelector({
    institutions,
    selectedId,
    onSelect,
    isLoading,
    operationType,
}: ServiceSelectorProps) {
    const [activeCategory, setActiveCategory] = React.useState<
        'mobile_money' | 'bank' | 'payment' | 'other'
    >('mobile_money');

    // Filter categories based on operation type
    const visibleCategories = React.useMemo(() => {
        if (operationType === 'paiement') {
            return categories.filter((c) => c.id === 'payment');
        }
        if (operationType === 'depot' || operationType === 'retrait') {
            return categories.filter((c) => c.id !== 'payment');
        }
        return categories;
    }, [operationType]);

    // Update active category when operation type changes
    useEffect(() => {
        if (operationType === 'paiement' && activeCategory !== 'payment') {
            setActiveCategory('payment');
        } else if (
            operationType !== 'paiement' &&
            activeCategory === 'payment'
        ) {
            setActiveCategory('mobile_money');
        }
    }, [operationType, activeCategory]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                    Récupération des partenaires...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Category Tabs - Hide if only one category (Payment) */}
            {visibleCategories.length > 1 && (
                <div className="flex gap-2 rounded-[24px] bg-slate-100 p-1.5">
                    {visibleCategories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() =>
                                setActiveCategory(
                                    cat.id as
                                        | 'mobile_money'
                                        | 'bank'
                                        | 'payment'
                                        | 'other',
                                )
                            }
                            className={cn(
                                'flex flex-1 items-center justify-center gap-2 rounded-[18px] px-4 py-4 text-sm font-bold transition-all',
                                activeCategory === cat.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <cat.icon
                                className={cn(
                                    'h-5 w-5',
                                    activeCategory === cat.id
                                        ? cat.color
                                        : 'text-slate-400',
                                )}
                            />
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <InstitutionSelector
                        institutions={institutions}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        type={activeCategory}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
