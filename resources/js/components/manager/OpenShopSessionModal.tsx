import { Counter } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Store } from 'lucide-react';
import { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
    shopName: string;
    counters: Counter[];
    isLoading: boolean;
}

const CURRENCIES = ['USD', 'CDF', 'EUR'];

export default function OpenShopSessionModal({
    isOpen,
    onClose,
    onConfirm,
    shopName,
    counters,
    isLoading,
}: Props) {
    const [globalAmounts, setGlobalAmounts] = useState<Record<string, string>>({
        USD: '0',
        CDF: '0',
        EUR: '0',
    });
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            notes,
            globalAmounts,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Store className="h-6 w-6 text-indigo-600" />
                        Ouvrir la Boutique : {shopName}
                    </DialogTitle>
                    <DialogDescription>
                        Initialisez la session de travail et le fond de caisse
                        global.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* General Notes */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="notes"
                            className="font-bold text-slate-700"
                        >
                            Note d'ouverture
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Équipe du jour..."
                            className="rounded-xl bg-slate-50"
                        />
                    </div>

                    {/* Global Funds Configuration */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-lg font-black text-slate-900">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            Fond de Caisse (Global)
                        </h4>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid grid-cols-3 gap-3">
                                {CURRENCIES.map((currency) => (
                                    <div key={currency} className="space-y-1">
                                        <Label className="text-xs font-bold text-slate-400">
                                            {currency}
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={globalAmounts[currency]}
                                            onChange={(e) =>
                                                setGlobalAmounts((prev) => ({
                                                    ...prev,
                                                    [currency]: e.target.value,
                                                }))
                                            }
                                            className="h-9 text-sm font-bold"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            Ce montant sera disponible pour tous les guichets de
                            la boutique.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 font-bold hover:bg-indigo-700"
                        >
                            {isLoading ? 'Ouverture...' : 'Ouvrir la Session'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
