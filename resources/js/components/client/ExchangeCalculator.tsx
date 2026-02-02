import { base44, ExchangeRate } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    Calculator,
    Coins,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
    side: 'buy' | 'sell'; // buy = bureau buys USD (gives CDF), sell = bureau sells USD (gives USD)
    // side === 'buy' means Client gives USD, Bureau buys USD. Direction: USD -> CDF. Rate: rate.buy_rate
    // side === 'sell' means Client receives USD, Bureau sells USD. Direction: CDF -> USD. Rate: rate.sell_rate
}

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

    useEffect(() => {
        if (selection && amountFrom) {
            const { rate, side } = selection;
            const appliedRate = side === 'buy' ? rate.buy_rate : rate.sell_rate;
            const numAmount = parseFloat(amountFrom);

            if (!isNaN(numAmount) && appliedRate) {
                let finalResult = 0;
                const currencies = rate.currency_pair?.split('/') || [
                    'USD',
                    'CDF',
                ];

                if (side === 'buy') {
                    // USD -> CDF (Client gives USD)
                    finalResult = numAmount * appliedRate;
                } else {
                    // CDF -> USD (Client gives CDF)
                    finalResult = numAmount / appliedRate;
                }

                setResult(finalResult);

                onSelect({
                    currency_from:
                        side === 'buy' ? currencies[0] : currencies[1],
                    currency_to: side === 'buy' ? currencies[1] : currencies[0],
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
    }, [selection, amountFrom]);

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
        <div className="space-y-10">
            {/* Pair Selection */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-slate-800 uppercase">
                        Choisissez votre opération
                    </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {rates.map((rate, index) => {
                        const currencies = rate.currency_pair?.split('/') || [
                            'USD',
                            'CDF',
                        ];

                        return (
                            <React.Fragment
                                key={`exchange-rate-${rate.id}-${index}`}
                            >
                                {/* USD -> CDF (Bureau Buys USD) */}
                                <button
                                    onClick={() =>
                                        setSelection({ rate, side: 'buy' })
                                    }
                                    className={cn(
                                        'group relative flex flex-col items-center justify-center rounded-[2.5rem] border-4 p-8 transition-all duration-300',
                                        selection?.rate.id === rate.id &&
                                            selection.side === 'buy'
                                            ? 'border-indigo-500 bg-white shadow-2xl shadow-indigo-500/20'
                                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white hover:shadow-xl',
                                    )}
                                >
                                    <div className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                        <span>{currencies[0]}</span>
                                        <ArrowRight
                                            className={cn(
                                                'h-6 w-6 transition-transform group-hover:translate-x-1',
                                                selection?.side === 'buy'
                                                    ? 'text-indigo-500'
                                                    : 'text-slate-300',
                                            )}
                                        />
                                        <span>{currencies[1]}</span>
                                    </div>
                                    <div className="mt-4 rounded-2xl bg-indigo-50 px-6 py-2">
                                        <span className="text-sm font-black text-indigo-600">
                                            1 {currencies[0]} = {rate.buy_rate}{' '}
                                            {currencies[1]}
                                        </span>
                                    </div>
                                </button>

                                {/* CDF -> USD (Bureau Sells USD) */}
                                <button
                                    onClick={() =>
                                        setSelection({ rate, side: 'sell' })
                                    }
                                    className={cn(
                                        'group relative flex flex-col items-center justify-center rounded-[2.5rem] border-4 p-8 transition-all duration-300',
                                        selection?.rate.id === rate.id &&
                                            selection.side === 'sell'
                                            ? 'border-indigo-500 bg-white shadow-2xl shadow-indigo-500/20'
                                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white hover:shadow-xl',
                                    )}
                                >
                                    <div className="flex items-center gap-4 text-2xl font-black text-slate-900">
                                        <span>{currencies[1]}</span>
                                        <ArrowRight
                                            className={cn(
                                                'h-6 w-6 transition-transform group-hover:translate-x-1',
                                                selection?.side === 'sell'
                                                    ? 'text-indigo-500'
                                                    : 'text-slate-300',
                                            )}
                                        />
                                        <span>{currencies[0]}</span>
                                    </div>
                                    <div className="mt-4 rounded-2xl bg-slate-100 px-6 py-2">
                                        <span className="text-sm font-black text-slate-600">
                                            {rate.sell_rate} {currencies[1]} = 1{' '}
                                            {currencies[0]}
                                        </span>
                                    </div>
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Calculator Area */}
            <AnimatePresence>
                {selection && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="shadow-3xl overflow-hidden rounded-[3rem] border-4 border-white bg-white/60 p-10 backdrop-blur-2xl"
                    >
                        <div className="grid gap-10 md:grid-cols-11 md:items-center">
                            {/* Input */}
                            <div className="space-y-4 md:col-span-11 lg:col-span-5">
                                <Label className="ml-2 text-sm font-black tracking-widest text-slate-400 uppercase">
                                    Montant en{' '}
                                    {selection.side === 'buy'
                                        ? selection.rate.currency_pair?.split(
                                              '/',
                                          )[0]
                                        : selection.rate.currency_pair?.split(
                                              '/',
                                          )[1]}
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={amountFrom}
                                        onChange={(e) =>
                                            setAmountFrom(e.target.value)
                                        }
                                        className="h-20 rounded-[2rem] border-none bg-white px-8 text-3xl font-black text-slate-900 shadow-xl focus:ring-4 focus:ring-indigo-500/20"
                                    />
                                    <div className="absolute top-1/2 right-6 -translate-y-1/2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-500">
                                        {selection.side === 'buy'
                                            ? selection.rate.currency_pair?.split(
                                                  '/',
                                              )[0]
                                            : selection.rate.currency_pair?.split(
                                                  '/',
                                              )[1]}
                                    </div>
                                </div>
                            </div>

                            {/* Divider/Icon */}
                            <div className="flex justify-center md:col-span-11 lg:col-span-1">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                            </div>

                            {/* Result */}
                            <div className="space-y-4 md:col-span-11 lg:col-span-5">
                                <Label className="ml-2 text-sm font-black tracking-widest text-slate-400 uppercase">
                                    Vous recevrez (
                                    {selection.side === 'buy'
                                        ? selection.rate.currency_pair?.split(
                                              '/',
                                          )[1]
                                        : selection.rate.currency_pair?.split(
                                              '/',
                                          )[0]}
                                    )
                                </Label>
                                <div className="flex h-20 items-center rounded-[2rem] bg-indigo-500 px-8">
                                    <span className="text-3xl font-black text-white">
                                        {result !== null
                                            ? result.toLocaleString(undefined, {
                                                  maximumFractionDigits: 2,
                                              })
                                            : '--.--'}
                                    </span>
                                    <span className="ml-auto rounded-xl bg-white/20 px-4 py-2 text-sm font-black text-white">
                                        {selection.side === 'buy'
                                            ? selection.rate.currency_pair?.split(
                                                  '/',
                                              )[1]
                                            : selection.rate.currency_pair?.split(
                                                  '/',
                                              )[0]}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Formula Footer */}
                        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-8">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <span className="text-lg font-bold text-slate-600">
                                    Décompte :{' '}
                                    <span className="text-slate-900">
                                        {amountFrom || '0'}
                                    </span>{' '}
                                    {selection.side === 'buy' ? '×' : '÷'}{' '}
                                    <span className="text-indigo-600">
                                        {selection.side === 'buy'
                                            ? selection.rate.buy_rate
                                            : selection.rate.sell_rate}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-6 py-3">
                                <Coins className="h-5 w-5 text-amber-500" />
                                <span className="font-black text-slate-900 italic">
                                    {selection.side === 'buy'
                                        ? `Taux : 1 ${selection.rate.currency_pair?.split('/')[0]} = ${selection.rate.buy_rate} ${selection.rate.currency_pair?.split('/')[1]}`
                                        : `Taux : ${selection.rate.sell_rate} ${selection.rate.currency_pair?.split('/')[1]} = 1 ${selection.rate.currency_pair?.split('/')[0]}`}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
