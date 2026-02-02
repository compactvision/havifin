import { base44, ExchangeRate } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRightLeft,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const currencyPairs = [
    { id: 'USD_CDF', label: 'USD → CDF', from: 'USD', to: 'CDF' },
    { id: 'EUR_CDF', label: 'EUR → CDF', from: 'EUR', to: 'CDF' },
    { id: 'EUR_USD', label: 'EUR → USD', from: 'EUR', to: 'USD' },
    { id: 'CDF_USD', label: 'CDF → USD', from: 'CDF', to: 'USD' },
];

export default function RatesManager() {
    const queryClient = useQueryClient();
    const [newRate, setNewRate] = useState({
        currency_pair: '',
        buy_rate: '',
        sell_rate: '',
    });
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: rates = [], isLoading } = useQuery({
        queryKey: ['rates'],
        queryFn: () => base44.entities.ExchangeRate.filter({ is_active: true }),
    });

    const updateMutation = useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: number;
            data: Partial<ExchangeRate>;
        }) => {
            await base44.entities.ExchangeRate.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            toast.success('Taux mis à jour');
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await base44.entities.ExchangeRate.create({
                ...data,
                buy_rate: parseFloat(data.buy_rate),
                sell_rate: parseFloat(data.sell_rate),
                is_active: true,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            setNewRate({ currency_pair: '', buy_rate: '', sell_rate: '' });
            setShowAddForm(false);
            toast.success('Nouveau taux de change configuré');
        },
        onError: () => toast.error('Erreur lors de la création du taux'),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await base44.entities.ExchangeRate.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            toast.success('Configuration supprimée');
        },
    });

    const handleUpdateRate = (
        rate: ExchangeRate,
        field: string,
        value: string,
    ) => {
        if (!value) return;
        updateMutation.mutate({
            id: rate.id,
            data: { [field]: parseFloat(value) },
        });
    };

    return (
        <div className="space-y-8">
            {/* Header Control */}
            <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-100 bg-slate-100/50 p-4">
                <div className="ml-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                        <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black tracking-tight text-slate-800 uppercase">
                            Marché des Devises
                        </h4>
                        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            {rates.length} Paires Actives
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={cn(
                        'h-11 rounded-xl px-6 text-xs font-black tracking-widest uppercase transition-all',
                        showAddForm
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700',
                    )}
                >
                    {showAddForm ? (
                        <X className="mr-2 h-4 w-4" />
                    ) : (
                        <Plus className="mr-2 h-4 w-4" />
                    )}
                    {showAddForm ? 'Fermer' : 'Ajouter une Paire'}
                </Button>
            </div>

            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="relative rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
                            <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 bg-indigo-500/10 blur-[100px]" />

                            <h5 className="mb-8 flex items-center gap-3 text-xl font-black tracking-tight">
                                <Plus className="h-6 w-6 text-indigo-400" />
                                Nouvelle Configuration
                            </h5>

                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Paire de devises
                                    </Label>
                                    <Select
                                        value={newRate.currency_pair}
                                        onValueChange={(v) =>
                                            setNewRate({
                                                ...newRate,
                                                currency_pair: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                            <SelectValue placeholder="Choisir une paire" />
                                        </SelectTrigger>
                                        <SelectContent className="border-slate-800 bg-slate-900 text-white">
                                            {currencyPairs.map((pair) => (
                                                <SelectItem
                                                    key={pair.id}
                                                    value={pair.id}
                                                    className="hover:bg-slate-800 focus:bg-slate-800"
                                                >
                                                    {pair.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Taux d'Achat (Le client donne{' '}
                                        {newRate.currency_pair === 'CDF_USD'
                                            ? 'CDF'
                                            : 'USD'}
                                        , 1{' '}
                                        {newRate.currency_pair === 'CDF_USD'
                                            ? 'USD'
                                            : newRate.currency_pair.split(
                                                  '_',
                                              )[0] || 'Unité'}{' '}
                                        =)
                                    </Label>
                                    <div className="relative">
                                        <TrendingDown className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={newRate.buy_rate}
                                            onChange={(e) =>
                                                setNewRate({
                                                    ...newRate,
                                                    buy_rate: e.target.value,
                                                })
                                            }
                                            className="h-12 rounded-xl border-white/10 bg-white/5 pl-11 font-mono font-black text-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                        Taux de Vente (Le bureau donne{' '}
                                        {newRate.currency_pair === 'CDF_USD'
                                            ? 'CDF'
                                            : 'USD'}
                                        , 1{' '}
                                        {newRate.currency_pair === 'CDF_USD'
                                            ? 'USD'
                                            : newRate.currency_pair.split(
                                                  '_',
                                              )[0] || 'Unité'}{' '}
                                        =)
                                    </Label>
                                    <div className="relative">
                                        <TrendingUp className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-blue-400" />
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={newRate.sell_rate}
                                            onChange={(e) =>
                                                setNewRate({
                                                    ...newRate,
                                                    sell_rate: e.target.value,
                                                })
                                            }
                                            className="h-12 rounded-xl border-white/10 bg-white/5 pl-11 font-mono font-black text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex justify-end gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowAddForm(false)}
                                    className="h-12 rounded-xl px-8 text-xs font-black tracking-widest text-slate-400 uppercase hover:bg-white/5 hover:text-white"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() =>
                                        createMutation.mutate(newRate)
                                    }
                                    disabled={
                                        createMutation.isPending ||
                                        !newRate.currency_pair
                                    }
                                    className="h-12 rounded-xl bg-white px-10 text-xs font-black tracking-widest text-slate-900 uppercase transition-all hover:bg-slate-100"
                                >
                                    {createMutation.isPending ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Activer le Taux
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {rates.map((rate: ExchangeRate) => {
                    const pair = currencyPairs.find(
                        (p) => p.id === rate.currency_pair,
                    );
                    return (
                        <motion.div
                            key={rate.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group rounded-[2rem] border-2 border-slate-50 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:border-indigo-100"
                        >
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/10 transition-transform group-hover:rotate-6">
                                        <span className="text-sm font-black text-white">
                                            {pair?.from ||
                                                rate.currency_pair.split(
                                                    '_',
                                                )[0]}
                                        </span>
                                    </div>
                                    <TrendingUp className="h-4 w-4 text-slate-300" />
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50">
                                        <span className="text-sm font-black text-indigo-600">
                                            {pair?.to ||
                                                rate.currency_pair.split(
                                                    '_',
                                                )[1]}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        deleteMutation.mutate(rate.id)
                                    }
                                    className="h-10 w-10 rounded-xl text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                            Achat (1{' '}
                                            {rate.currency_pair.split('_')[0]}{' '}
                                            =)
                                        </span>
                                        <TrendingDown className="h-3 w-3 text-emerald-500" />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={rate.buy_rate}
                                            onChange={(e) =>
                                                handleUpdateRate(
                                                    rate,
                                                    'buy_rate',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-14 rounded-2xl border-transparent bg-slate-50 font-mono text-xl font-black text-slate-900 focus:border-indigo-500 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                            Vente (1{' '}
                                            {rate.currency_pair.split('_')[0]}{' '}
                                            =)
                                        </span>
                                        <TrendingUp className="h-3 w-3 text-blue-500" />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={rate.sell_rate}
                                            onChange={(e) =>
                                                handleUpdateRate(
                                                    rate,
                                                    'sell_rate',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-14 rounded-2xl border-transparent bg-slate-50 font-mono text-xl font-black text-slate-900 focus:border-indigo-500 focus:bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {rates.length === 0 && !isLoading && (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 py-20">
                        <ArrowRightLeft className="mb-4 h-16 w-16 text-slate-200" />
                        <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                            Aucun taux configuré
                        </p>
                    </div>
                )}
            </div>
            {isLoading && (
                <div className="flex justify-center p-20">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                </div>
            )}
        </div>
    );
}
