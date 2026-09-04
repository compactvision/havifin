import { base44, ExchangeRate, RateHistoryEntry } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FlagIcon } from '@/components/ui/flag-icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRightLeft,
    History,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    TrendingUp,
    X,
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/fr';
import { useState } from 'react';
import { toast } from 'sonner';

// Known pairs get a flag pair and a friendly label out of the box; a manager
// can still type any other 3-letter code freely (see the add-pair form).
const currencyPairs = [
    { id: 'USD_CDF', label: 'USD → CDF', from: 'USD', to: 'CDF' },
    { id: 'CDF_USD', label: 'CDF → USD', from: 'CDF', to: 'USD' },
    { id: 'EUR_CDF', label: 'EUR → CDF', from: 'EUR', to: 'CDF' },
    { id: 'CDF_EUR', label: 'CDF → EUR', from: 'CDF', to: 'EUR' },
    { id: 'EUR_USD', label: 'EUR → USD', from: 'EUR', to: 'USD' },
    { id: 'USD_EUR', label: 'USD → EUR', from: 'USD', to: 'EUR' },
];

export default function RatesManager() {
    const queryClient = useQueryClient();
    const [activeSubTab, setActiveSubTab] = useState<'rates' | 'history'>(
        'rates',
    );
    const [newRate, setNewRate] = useState({
        from: '',
        to: '',
        rate: '',
    });
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: rates = [], isLoading } = useQuery({
        queryKey: ['rates'],
        queryFn: () => base44.entities.ExchangeRate.filter({ is_active: true }),
    });

    const { data: history = [], isLoading: isHistoryLoading } = useQuery({
        queryKey: ['rate-history'],
        queryFn: () => base44.entities.ExchangeRate.history(),
        enabled: activeSubTab === 'history',
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
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            queryClient.invalidateQueries({ queryKey: ['rate-history'] });
            toast.success('Taux mis à jour');
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof newRate) => {
            await base44.entities.ExchangeRate.create({
                currency_pair: `${data.from}_${data.to}`.toUpperCase(),
                rate: parseFloat(data.rate),
                is_active: true,
            } as Partial<ExchangeRate>);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            queryClient.invalidateQueries({ queryKey: ['rate-history'] });
            setNewRate({ from: '', to: '', rate: '' });
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
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            queryClient.invalidateQueries({ queryKey: ['rate-history'] });
            toast.success('Configuration supprimée');
        },
    });

    const handleUpdateRate = (rate: ExchangeRate, value: string) => {
        if (!value) return;
        updateMutation.mutate({
            id: rate.id,
            data: { rate: parseFloat(value) },
        });
    };

    const pairFromValid = /^[A-Za-z]{3}$/.test(newRate.from);
    const pairToValid = /^[A-Za-z]{3}$/.test(newRate.to);

    return (
        <div className="space-y-8">
            {/* Header Control */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-100/50 p-4">
                <div className="ml-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                        <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
                            Marché des Devises
                        </h4>
                        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                            {rates.length} Paires Actives
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveSubTab('rates')}
                            className={cn(
                                'rounded-lg px-4 py-2 text-xs font-bold tracking-wide uppercase transition-colors',
                                activeSubTab === 'rates'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-500 hover:text-slate-800',
                            )}
                        >
                            Taux
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSubTab('history')}
                            className={cn(
                                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold tracking-wide uppercase transition-colors',
                                activeSubTab === 'history'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-500 hover:text-slate-800',
                            )}
                        >
                            <History className="h-3.5 w-3.5" />
                            Historique
                        </button>
                    </div>

                    {activeSubTab === 'rates' && (
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
                    )}
                </div>
            </div>

            {activeSubTab === 'history' ? (
                <div className="space-y-3 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    {isHistoryLoading && (
                        <div className="flex justify-center py-10 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    )}
                    {!isHistoryLoading && history.length === 0 && (
                        <p className="py-10 text-center text-sm text-slate-400">
                            Aucun changement de taux enregistré.
                        </p>
                    )}
                    {history.map((entry: RateHistoryEntry) => (
                        <div
                            key={entry.id}
                            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                        >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                <History className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-800">
                                    {entry.description}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {moment(entry.created_at)
                                        .locale('fr')
                                        .format('DD/MM/YYYY à HH:mm')}
                                    {entry.cashier?.name &&
                                        ` · ${entry.cashier.name}`}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <AnimatePresence>
                        {showAddForm && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="relative rounded-[2rem] border-2 border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                                    <h5 className="mb-8 flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
                                        <Plus className="h-6 w-6 text-indigo-500" />
                                        Nouvelle Configuration
                                    </h5>

                                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                Paire de devises
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    maxLength={3}
                                                    placeholder="USD"
                                                    value={newRate.from}
                                                    onChange={(e) =>
                                                        setNewRate({
                                                            ...newRate,
                                                            from: e.target.value
                                                                .toUpperCase()
                                                                .replace(
                                                                    /[^A-Z]/g,
                                                                    '',
                                                                ),
                                                        })
                                                    }
                                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 text-center font-mono font-black tracking-widest text-slate-900 uppercase"
                                                />
                                                <ArrowRightLeft className="h-4 w-4 shrink-0 text-slate-300" />
                                                <Input
                                                    maxLength={3}
                                                    placeholder="CDF"
                                                    value={newRate.to}
                                                    onChange={(e) =>
                                                        setNewRate({
                                                            ...newRate,
                                                            to: e.target.value
                                                                .toUpperCase()
                                                                .replace(
                                                                    /[^A-Z]/g,
                                                                    '',
                                                                ),
                                                        })
                                                    }
                                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 text-center font-mono font-black tracking-widest text-slate-900 uppercase"
                                                />
                                            </div>
                                            <p className="ml-1 text-[10px] font-semibold text-slate-400">
                                                Codes ISO à 3 lettres, ex.
                                                USD, EUR, CDF - toute devise
                                                convient, pas seulement
                                                celles listées ci-dessous.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="ml-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                                Taux direct (1{' '}
                                                {newRate.from ||
                                                    'devise source'}{' '}
                                                = combien de{' '}
                                                {newRate.to ||
                                                    'devise cible'}
                                                ?)
                                            </Label>
                                            <div className="relative">
                                                <TrendingUp className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                                                <Input
                                                    type="number"
                                                    min="0.00000001"
                                                    step="any"
                                                    placeholder="Ex. 2250 ou 0.00044"
                                                    value={newRate.rate}
                                                    onChange={(e) =>
                                                        setNewRate({
                                                            ...newRate,
                                                            rate: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 font-mono font-black text-slate-900"
                                                />
                                            </div>
                                            <p className="ml-1 text-[10px] font-semibold text-slate-400">
                                                Le sens inverse doit être
                                                configuré séparément.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-10 flex justify-end gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                setShowAddForm(false)
                                            }
                                            className="h-12 rounded-xl px-8 text-xs font-black tracking-widest text-slate-500 uppercase hover:bg-slate-100"
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                createMutation.mutate(
                                                    newRate,
                                                )
                                            }
                                            disabled={
                                                createMutation.isPending ||
                                                !pairFromValid ||
                                                !pairToValid ||
                                                Number(newRate.rate) <= 0
                                            }
                                            className="h-12 rounded-xl bg-indigo-600 px-10 text-xs font-black tracking-widest text-white uppercase shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700"
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
                    const pairId =
                        rate.currency_pair ??
                        `${rate.currency_from}_${rate.currency_to}`;
                    const pair = currencyPairs.find((p) => p.id === pairId);
                    return (
                        <motion.div
                            key={rate.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group rounded-[2rem] border-2 border-slate-50 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:border-indigo-100"
                        >
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/10 transition-transform group-hover:rotate-6">
                                        <span className="text-sm font-black text-white">
                                            {pair?.from || pairId.split('_')[0]}
                                        </span>
                                        <FlagIcon
                                            currency={
                                                pair?.from ||
                                                pairId.split('_')[0]
                                            }
                                            className="absolute -top-2 -right-2 h-5 shadow-sm"
                                        />
                                    </div>
                                    <TrendingUp className="h-4 w-4 text-slate-300" />
                                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50">
                                        <span className="text-sm font-black text-indigo-600">
                                            {pair?.to || pairId.split('_')[1]}
                                        </span>
                                        <FlagIcon
                                            currency={
                                                pair?.to ||
                                                pairId.split('_')[1]
                                            }
                                            className="absolute -top-2 -right-2 h-5 shadow-sm"
                                        />
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

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                            1 {pairId.split('_')[0]} = combien
                                            de {pairId.split('_')[1]} ?
                                        </span>
                                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min="0.00000001"
                                            step="any"
                                            defaultValue={
                                                rate.rate ?? rate.buy_rate
                                            }
                                            onBlur={(e) =>
                                                handleUpdateRate(
                                                    rate,
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
                </>
            )}
        </div>
    );
}
