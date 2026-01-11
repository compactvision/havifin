import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    Plus,
    Save,
    Trash2,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const currencyPairs = [
    { id: 'USD_CDF', label: 'USD → CDF', from: 'USD', to: 'CDF' },
    { id: 'EUR_CDF', label: 'EUR → CDF', from: 'EUR', to: 'CDF' },
    { id: 'EUR_USD', label: 'EUR → USD', from: 'EUR', to: 'USD' },
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
        mutationFn: async ({ id, data }) => {
            await base44.entities.ExchangeRate.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            toast.success('Taux mis à jour');
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
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
            toast.success('Taux créé');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.ExchangeRate.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            toast.success('Taux supprimé');
        },
    });

    const handleUpdateRate = (rate, field, value) => {
        updateMutation.mutate({
            id: rate.id,
            data: { [field]: parseFloat(value) },
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Taux de Change</CardTitle>
                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    variant="outline"
                    size="sm"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                </Button>
            </CardHeader>
            <CardContent>
                {showAddForm && (
                    <div className="mb-6 space-y-4 rounded-xl bg-slate-50 p-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Paire de devises</Label>
                                <Select
                                    value={newRate.currency_pair}
                                    onValueChange={(v) =>
                                        setNewRate({
                                            ...newRate,
                                            currency_pair: v,
                                        })
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencyPairs.map((pair) => (
                                            <SelectItem
                                                key={pair.id}
                                                value={pair.id}
                                            >
                                                {pair.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Taux d'achat</Label>
                                <Input
                                    type="number"
                                    value={newRate.buy_rate}
                                    onChange={(e) =>
                                        setNewRate({
                                            ...newRate,
                                            buy_rate: e.target.value,
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Taux de vente</Label>
                                <Input
                                    type="number"
                                    value={newRate.sell_rate}
                                    onChange={(e) =>
                                        setNewRate({
                                            ...newRate,
                                            sell_rate: e.target.value,
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setShowAddForm(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={() => createMutation.mutate(newRate)}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Enregistrer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {rates.map((rate: any) => {
                        const pair = currencyPairs.find(
                            (p) => p.id === rate.currency_pair,
                        );
                        return (
                            <div
                                key={rate.id}
                                className="flex items-center gap-4 rounded-xl bg-slate-50 p-4"
                            >
                                <div className="flex-1">
                                    <div className="font-semibold text-slate-800">
                                        {pair?.label || rate.currency_pair}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-green-500" />
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
                                            className="w-28"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
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
                                            className="w-28"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            deleteMutation.mutate(rate.id)
                                        }
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {rates.length === 0 && !isLoading && (
                        <div className="py-8 text-center text-slate-500">
                            Aucun taux configuré
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
