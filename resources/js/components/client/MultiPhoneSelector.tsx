import { ClientPhone } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Phone, Plus } from 'lucide-react';
import { useState } from 'react';

interface MultiPhoneSelectorProps {
    phones: ClientPhone[];
    selectedPhone: string;
    onSelect: (phone: string) => void;
    onAdd: (phone: string) => Promise<void>;
    isAdding?: boolean;
}

export default function MultiPhoneSelector({
    phones,
    selectedPhone,
    onSelect,
    onAdd,
    isAdding = false,
}: MultiPhoneSelectorProps) {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newPhone, setNewPhone] = useState('');

    const handleAdd = async () => {
        if (newPhone.length === 10) {
            await onAdd(newPhone);
            setIsAddingNew(false);
            setNewPhone('');
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                {phones.map((p) => (
                    <motion.button
                        key={p.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onSelect(p.phone_number)}
                        className={cn(
                            'relative flex items-center gap-4 overflow-hidden rounded-2xl border-2 p-4 transition-all duration-200',
                            selectedPhone === p.phone_number
                                ? 'border-blue-500 bg-blue-50/50 shadow-md'
                                : 'border-slate-100 bg-white hover:border-slate-200',
                        )}
                    >
                        <div
                            className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-xl',
                                selectedPhone === p.phone_number
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 text-slate-400',
                            )}
                        >
                            <Phone className="h-5 w-5" />
                        </div>

                        <div className="flex-1 text-left">
                            <span
                                className={cn(
                                    'block text-lg font-bold',
                                    selectedPhone === p.phone_number
                                        ? 'text-blue-700'
                                        : 'text-slate-700',
                                )}
                            >
                                {p.phone_number}
                            </span>
                            {p.is_primary && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black tracking-wider text-blue-500/60 uppercase">
                                    Principal
                                </span>
                            )}
                        </div>

                        {selectedPhone === p.phone_number && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white"
                            >
                                <Check className="h-4 w-4" />
                            </motion.div>
                        )}
                    </motion.button>
                ))}
            </div>

            <AnimatePresence>
                {!isAddingNew ? (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAddingNew(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 font-bold text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-500"
                    >
                        <Plus className="h-5 w-5" />
                        Ajouter un nouveau numéro
                    </motion.button>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-3 rounded-2xl border-2 border-blue-100 bg-blue-50/30 p-4"
                    >
                        <Label className="mb-1 block font-bold text-blue-700">
                            Nouveau numéro
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={newPhone}
                                onChange={(e) =>
                                    setNewPhone(
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 10),
                                    )
                                }
                                placeholder="0XXXXXXXXX"
                                className="h-12 rounded-xl bg-white focus:border-blue-500 focus:ring-blue-500"
                                autoFocus
                            />
                            <Button
                                onClick={handleAdd}
                                disabled={newPhone.length < 10 || isAdding}
                                className="h-12 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700"
                            >
                                {isAdding ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Plus className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddingNew(false)}
                            className="w-full text-slate-500 hover:text-red-500"
                        >
                            Annuler
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
