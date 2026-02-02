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

    const currencies = selection?.rate.currency_pair?.split('/') || [
        'USD',
        'CDF',
    ];
    const appliedRate = selection
        ? selection.side === 'buy'
            ? selection.rate.buy_rate
            : selection.rate.sell_rate
        : 0;

    useEffect(() => {
        if (selection && amountFrom && appliedRate) {
            const numAmount = parseFloat(amountFrom);

            if (!isNaN(numAmount)) {
                let finalResult = 0;
                if (selection.side === 'buy') {
                    // Client gives USD -> receives CDF
                    finalResult = numAmount * appliedRate;
                } else {
                    // Client gives CDF -> receives USD
                    finalResult = numAmount / appliedRate;
                }

                setResult(finalResult);

                onSelect({
                    currency_from:
                        selection.side === 'buy'
                            ? currencies[0]
                            : currencies[1],
                    currency_to:
                        selection.side === 'buy'
                            ? currencies[1]
                            : currencies[0],
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
    }, [selection, amountFrom, appliedRate]);

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
            {/* Selection Step */}
            {!selection ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-slate-800 uppercase">
                            Quel change souhaitez-vous effectuer ?
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {rates.map((rate, index) => {
                            const currencies = rate.currency_pair?.split(
                                '/',
                            ) || ['USD', 'CDF'];

                            return (
                                <React.Fragment
                                    key={`rate-${rate.id || index}`}
                                >
                                    {/* USD -> CDF */}
                                    <button
                                        onClick={() =>
                                            setSelection({ rate, side: 'buy' })
                                        }
                                        className="group relative flex flex-col items-center justify-center rounded-[3rem] border-4 border-slate-100 bg-slate-50/50 p-10 transition-all duration-300 hover:border-indigo-200 hover:bg-white hover:shadow-2xl"
                                    >
                                        <div className="mb-4 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                            Vendre mes Dollars
                                        </div>
                                        <div className="flex items-center gap-4 text-3xl font-black text-slate-900">
                                            <span>{currencies[0]}</span>
                                            <ArrowRight className="h-8 w-8 text-indigo-500 transition-transform group-hover:translate-x-2" />
                                            <span>{currencies[1]}</span>
                                        </div>
                                        <div className="mt-6 rounded-2xl bg-indigo-50 px-6 py-2">
                                            <span className="text-sm font-black text-indigo-600">
                                                Taux : 1 {currencies[0]} ={' '}
                                                {rate.buy_rate} {currencies[1]}
                                            </span>
                                        </div>
                                    </button>

                                    {/* CDF -> USD */}
                                    <button
                                        onClick={() =>
                                            setSelection({ rate, side: 'sell' })
                                        }
                                        className="group relative flex flex-col items-center justify-center rounded-[3rem] border-4 border-slate-100 bg-slate-50/50 p-10 transition-all duration-300 hover:border-indigo-200 hover:bg-white hover:shadow-2xl"
                                    >
                                        <div className="mb-4 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                            Acheter des Dollars
                                        </div>
                                        <div className="flex items-center gap-4 text-3xl font-black text-slate-900">
                                            <span>{currencies[1]}</span>
                                            <ArrowRight className="h-8 w-8 text-indigo-500 transition-transform group-hover:translate-x-2" />
                                            <span>{currencies[0]}</span>
                                        </div>
                                        <div className="mt-6 rounded-2xl bg-indigo-50 px-6 py-2">
                                            <span className="text-sm font-black text-indigo-600">
                                                Taux : 1 {currencies[0]} ={' '}
                                                {rate.sell_rate} {currencies[1]}
                                            </span>
                                        </div>
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
                                <Calculator className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-slate-800 uppercase">
                                Calcul du Change :{' '}
                                {selection.side === 'buy'
                                    ? 'USD → CDF'
                                    : 'CDF → USD'}
                            </h3>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelection(null)}
                            className="h-10 rounded-xl font-black text-indigo-600 hover:bg-indigo-50"
                        >
                            Changer d'opération
                        </Button>
                    </div>

                    <div className="shadow-3xl overflow-hidden rounded-[3rem] border-4 border-white bg-white/60 p-10 backdrop-blur-2xl">
                        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                            {/* Input Area */}
                            <div className="space-y-6">
                                <div>
                                    <Label className="ml-2 text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                                        Vous donnez (
                                        {selection.side === 'buy'
                                            ? 'USD'
                                            : 'CDF'}
                                        )
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={amountFrom}
                                            onChange={(e) =>
                                                setAmountFrom(e.target.value)
                                            }
                                            className="h-24 rounded-[2.5rem] border-none bg-white px-10 text-4xl font-black text-slate-900 shadow-2xl focus:ring-4 focus:ring-indigo-500/20"
                                            autoFocus
                                        />
                                        <div className="absolute top-1/2 right-8 -translate-y-1/2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white">
                                            {selection.side === 'buy'
                                                ? 'USD'
                                                : 'CDF'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 p-5 px-6">
                                    <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                                    <span className="text-sm font-black text-indigo-600 italic">
                                        Libellé :{' '}
                                        {selection.side === 'buy'
                                            ? `Client donne ${currencies[0]}, reçoit ${currencies[1]}`
                                            : `Client donne ${currencies[1]}, reçoit ${currencies[0]}`}
                                        {' | '} Taux : 1 {currencies[0]} ={' '}
                                        {appliedRate} {currencies[1]}
                                    </span>
                                </div>
                            </div>

                            {/* Result Area */}
                            <div className="space-y-6">
                                <div>
                                    <Label className="ml-2 text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                                        Vous recevrez (
                                        {selection.side === 'buy'
                                            ? 'CDF'
                                            : 'USD'}
                                        )
                                    </Label>
                                    <div className="relative mt-2 flex h-24 items-center rounded-[2.5rem] bg-indigo-600 px-10 shadow-2xl shadow-indigo-600/30">
                                        <span className="text-4xl font-black text-white">
                                            {result !== null
                                                ? result.toLocaleString(
                                                      undefined,
                                                      {
                                                          maximumFractionDigits: 2,
                                                      },
                                                  )
                                                : '0.00'}
                                        </span>
                                        <div className="ml-auto rounded-2xl bg-white/20 px-6 py-3 text-sm font-black text-white">
                                            {selection.side === 'buy'
                                                ? 'CDF'
                                                : 'USD'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-bold text-slate-400">
                                            Conversion Directe
                                        </span>
                                    </div>
                                    {amountFrom && (
                                        <span className="text-xs font-black text-slate-400 uppercase">
                                            Calcul : {amountFrom}{' '}
                                            {selection.side === 'buy'
                                                ? '×'
                                                : '÷'}{' '}
                                            {selection.side === 'buy'
                                                ? selection.rate.buy_rate
                                                : selection.rate.sell_rate}
                                        </span>
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
