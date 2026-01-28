import { Institution } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Building2, Globe, Landmark, Smartphone } from 'lucide-react';

interface InstitutionSelectorProps {
    institutions: Institution[];
    selectedId?: number;
    onSelect: (id: number) => void;
    type: 'mobile_money' | 'bank' | 'payment' | 'other';
}

export default function InstitutionSelector({
    institutions,
    selectedId,
    onSelect,
    type,
}: InstitutionSelectorProps) {
    const filtered = institutions.filter((inst) => inst.type === type);

    const getIcon = () => {
        switch (type) {
            case 'mobile_money':
                return Smartphone;
            case 'bank':
                return Building2;
            case 'payment':
            case 'other':
                return Globe;
            default:
                return Building2;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'mobile_money':
                return 'Opérateurs Mobile';
            case 'bank':
                return 'Banques';
            case 'payment':
                return 'Services de Paiement';
            case 'other':
                return 'Autres Partenaires';
            default:
                return 'Institutions';
        }
    };

    const Icon = getIcon();

    return (
        <div className="space-y-4">
            <div className="mb-2 flex items-center gap-2">
                <Icon className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-800">
                    {getTitle()}
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {filtered.length > 0 ? (
                    filtered.map((inst) => (
                        <motion.button
                            key={inst.id}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onSelect(inst.id)}
                            className={cn(
                                'relative flex flex-col items-center justify-center rounded-[32px] border-2 p-6 transition-all duration-300',
                                selectedId === inst.id
                                    ? 'border-blue-500 bg-white shadow-xl ring-4 shadow-blue-500/10 ring-blue-50'
                                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white',
                            )}
                        >
                            <div
                                className={cn(
                                    'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner transition-colors',
                                    selectedId === inst.id
                                        ? 'bg-blue-50'
                                        : 'bg-white',
                                )}
                            >
                                {inst.logo_url ? (
                                    <img
                                        src={inst.logo_url}
                                        alt={inst.name}
                                        className="h-10 w-10 object-contain"
                                    />
                                ) : (
                                    <Landmark
                                        className={cn(
                                            'h-8 w-8',
                                            selectedId === inst.id
                                                ? 'text-blue-500'
                                                : 'text-slate-300',
                                        )}
                                    />
                                )}
                            </div>

                            <span
                                className={cn(
                                    'text-center text-sm font-black tracking-tight',
                                    selectedId === inst.id
                                        ? 'text-blue-700'
                                        : 'text-slate-600',
                                )}
                            >
                                {inst.name}
                            </span>

                            {selectedId === inst.id && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full border-4 border-white bg-blue-500 shadow-sm"
                                />
                            )}
                        </motion.button>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                            <Icon className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                            Aucun partenaire disponible
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
