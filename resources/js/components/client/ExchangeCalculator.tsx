import { base44, ExchangeRate } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Calculator,
    Coins,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface ExchangeCalculatorProps {
    onSelect: (data: {
        currency_from: string;
        currency_to: string;
        exchange_rate: number;
        amount_from: number;
        amount_to: number;
    }) => void;
    initialAmount?: string;
}

interface Selection {
    rate: ExchangeRate;
}

const currenciesFor = (rate: ExchangeRate): [string, string] => {
    if (rate.currency_from && rate.currency_to) {
        return [rate.currency_from, rate.currency_to];
    }

    const [from = '', to = ''] = rate.currency_pair.split(/[_/]/);
    return [from, to];
};

export default function ExchangeCalculator({
    onSelect,
    initialAmount = '',
}: ExchangeCalculatorProps) {
    const [selection, setSelection] = useState<Selection | null>(null);
    const [amountFrom, setAmountFrom] = useState(initialAmount);
    const [result, setResult] = useState<number | null>(null);

    const { data: rates = [], isLoading } = useQuery({
        queryKey: ['exchange-rates', 'active'],
        queryFn: () => base44.entities.ExchangeRate.getAll(),
    });

    const currencies = useMemo<[string, string]>(
        () => (selection ? currenciesFor(selection.rate) : ['', '']),
        [selection],
    );
    const appliedRate = selection
        ? Number(selection.rate.rate ?? selection.rate.buy_rate ?? 0)
        : 0;

    useEffect(() => {
        if (selection && amountFrom && appliedRate) {
            const numAmount = parseFloat(amountFrom);

            if (!isNaN(numAmount) && numAmount > 0) {
                const finalResult = numAmount * appliedRate;

                setResult(finalResult);

                onSelect({
                    currency_from: currencies[0],
                    currency_to: currencies[1],
                    exchange_rate: appliedRate,
                    amount_from: numAmount,
                    amount_to: finalResult,
                });
            } else {
                setResult(null);
            }
        } else {
            setResult(null);
        }
    }, [selection, amountFrom, appliedRate, currencies, onSelect]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="mt-4 font-bold text-slate-500">
                    Chargement des taux...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Selection Step */}
            {!selection ? (
                <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <div className="shadow-glow-blue/20 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                            Quel change souhaitez-vous effectuer ?
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {rates.map((rate, index) => {
                            const currencies = currenciesFor(rate);
                            const directRate = Number(
                                rate.rate ?? rate.buy_rate ?? 0,
                            );

                            return (
                                <motion.button
                                    key={`rate-${rate.id || index}`}
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelection({ rate })}
                                    className="group relative flex flex-col items-center justify-center rounded-[48px] border-2 border-slate-100 bg-white/40 p-12 backdrop-blur-md transition-all duration-300 hover:border-brand-blue/30 hover:bg-white hover:shadow-[0_30px_60px_-15px_rgba(31,97,228,0.2)]"
                                >
                                    <div className="mb-6 text-xs font-black tracking-[0.3em] text-slate-400 uppercase">
                                        Change disponible
                                    </div>
                                    <div className="flex items-center gap-6 text-4xl font-black text-slate-900">
                                        <span className="rounded-2xl bg-slate-900 px-4 py-2 text-2xl text-white">
                                            {currencies[0]}
                                        </span>
                                        <ArrowRight className="h-10 w-10 text-brand-blue transition-transform group-hover:translate-x-3" />
                                        <span className="text-brand-blue">
                                            {currencies[1]}
                                        </span>
                                    </div>
                                    <div className="mt-8 rounded-[20px] border border-brand-blue/10 bg-brand-blue/5 px-8 py-3">
                                        <span className="text-sm font-black text-brand-blue italic">
                                            1 {currencies[0]} ={' '}
                                            <span className="text-slate-900">
                                                {directRate.toLocaleString(
                                                    undefined,
                                                    {
                                                        maximumFractionDigits: 8,
                                                    },
                                                )}
                                            </span>{' '}
                                            {currencies[1]}
                                        </span>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                    {rates.length === 0 && (
                        <div className="rounded-[32px] border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center font-bold text-slate-500">
                            Aucun taux de change n’a été configuré.
                        </div>
                    )}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-slate-900 text-white shadow-xl">
                                <Calculator className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-800 uppercase">
                                    Calculateur de Convertissage
                                </h3>
                                <p className="text-xs font-bold text-slate-400">
                                    {currencies[0]} vers {currencies[1]}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelection(null)}
                            className="h-12 rounded-2xl font-black text-brand-blue hover:bg-brand-blue/5"
                        >
                            Changer d'opération
                        </Button>
                    </div>

                    <div className="glass-card shadow-premium overflow-hidden rounded-[56px] border-4 border-white p-12">
                        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
                            {/* Input Area */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="ml-4 text-[10px] font-black tracking-[0.4em] text-slate-400 uppercase">
                                        Montant à échanger
                                    </Label>
                                    <div className="group relative">
                                        <div className="absolute -inset-2 rounded-[40px] bg-brand-blue/20 opacity-0 blur-xl transition-opacity group-focus-within:opacity-100"></div>
                                        <div className="relative overflow-hidden rounded-[36px] border-2 border-slate-100 bg-slate-50 p-1 transition-all group-focus-within:border-brand-blue/30 group-focus-within:bg-white group-focus-within:shadow-2xl">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amountFrom}
                                                onChange={(e) =>
                                                    setAmountFrom(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-28 border-none bg-transparent px-10 text-5xl font-black text-slate-900 placeholder:text-slate-200 focus:ring-0"
                                                min="0.01"
                                                step="any"
                                                autoFocus
                                            />
                                            <div className="absolute top-1/2 right-4 flex h-20 w-24 -translate-y-1/2 items-center justify-center rounded-[28px] bg-slate-900 text-xl font-black text-white shadow-xl">
                                                {currencies[0]}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 rounded-[24px] border border-brand-blue/10 bg-brand-blue/[0.03] p-6">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                                        <TrendingUp className="h-5 w-5 text-brand-blue" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                            Taux appliqué aujourd'hui
                                        </p>
                                        <p className="text-lg font-black text-slate-800">
                                            1 {currencies[0]} ={' '}
                                            {appliedRate.toLocaleString(
                                                undefined,
                                                {
                                                    maximumFractionDigits: 8,
                                                },
                                            )}{' '}
                                            {currencies[1]}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Result Area */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="ml-4 text-[10px] font-black tracking-[0.4em] text-slate-400 uppercase">
                                        Vous recevrez en retour
                                    </Label>
                                    <div className="relative flex h-28 items-center overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-blue to-brand-deep px-12 shadow-[0_25px_50px_-12px_rgba(31,97,228,0.4)]">
                                        {/* Result Background Decoration */}
                                        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
                                        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-brand-cyan/20 blur-3xl"></div>

                                        <span className="text-5xl font-black tracking-tight text-white">
                                            {result !== null
                                                ? result.toLocaleString(
                                                      undefined,
                                                      {
                                                          maximumFractionDigits: 2,
                                                      },
                                                  )
                                                : '0'}
                                        </span>
                                        <div className="ml-auto flex flex-col items-end">
                                            <div className="rounded-2xl bg-white/20 px-6 py-2 text-xl font-black text-white backdrop-blur-md">
                                                {currencies[1]}
                                            </div>
                                            {result !== null &&
                                                result > 1000 && (
                                                    <span className="mt-2 text-[10px] font-black tracking-widest text-white/50 uppercase">
                                                        Approximatif
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-6 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,226,246,0.8)]"></div>
                                        <span className="text-xs font-black tracking-wide text-slate-400">
                                            Calcul Temps Réel
                                        </span>
                                    </div>
                                    {amountFrom && (
                                        <div className="group flex cursor-help items-center gap-2">
                                            <Coins className="h-4 w-4 text-amber-500 transition-transform group-hover:rotate-12" />
                                            <span className="text-[10px] font-black tracking-tighter text-slate-400 uppercase">
                                                {amountFrom} × {appliedRate}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
