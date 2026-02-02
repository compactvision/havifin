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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CashSession } from '@/types/cash';
import axios from 'axios';
import { Banknote, MinusCircle, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    session: CashSession;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CURRENCIES = ['USD', 'CDF', 'EUR'];

export default function AddMovementModal({
    session,
    isOpen,
    onClose,
    onSuccess,
}: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [description, setDescription] = useState('');
    const [performedBy, setPerformedBy] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Veuillez saisir un montant valide');
            return;
        }

        if (!description) {
            toast.error('Veuillez saisir un motif');
            return;
        }

        if (!performedBy) {
            toast.error('Veuillez saisir le nom de la personne');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post('/api/cash/movements', {
                cash_session_id: session.id,
                type: type,
                amount: amount,
                currency: currency,
                description: description,
                metadata: {
                    performed_by: performedBy,
                },
            });
            toast.success('Mouvement enregistré avec succès');
            onSuccess();
            onClose();
            // Reset form
            setAmount('');
            setDescription('');
            setPerformedBy('');
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                    "Erreur lors de l'enregistrement",
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="overflow-hidden rounded-3xl border-none bg-white p-0 shadow-2xl sm:max-w-[450px]">
                <div
                    className={`h-2 w-full ${type === 'deposit' ? 'bg-green-500' : 'bg-red-500'}`}
                />

                <form onSubmit={handleSubmit}>
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                                <Banknote className="h-6 w-6 text-brand-blue" />
                                Mouvement de Caisse
                            </DialogTitle>
                            <DialogDescription className="mt-2 text-xs font-bold tracking-tight text-slate-400 uppercase">
                                Enregistrer une entrée ou sortie de fonds
                                exceptionnelle
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-8">
                            {/* Type Selection */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('deposit')}
                                    className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all ${
                                        type === 'deposit'
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-slate-100 bg-slate-50 text-slate-400 grayscale hover:border-green-200 hover:grayscale-0'
                                    }`}
                                >
                                    <PlusCircle className="mb-2 h-8 w-8" />
                                    <span className="text-xs font-black uppercase">
                                        Entrée
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('withdrawal')}
                                    className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all ${
                                        type === 'withdrawal'
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-slate-100 bg-slate-50 text-slate-400 grayscale hover:border-red-200 hover:grayscale-0'
                                    }`}
                                >
                                    <MinusCircle className="mb-2 h-8 w-8" />
                                    <span className="text-xs font-black uppercase">
                                        Sortie
                                    </span>
                                </button>
                            </div>

                            {/* Amount & Currency */}
                            <div className="flex gap-3">
                                <div className="flex-1 space-y-2">
                                    <Label
                                        htmlFor="amount"
                                        className="px-1 text-xs font-black text-slate-500 uppercase"
                                    >
                                        Montant
                                    </Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(e.target.value)
                                        }
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 text-lg font-black transition-all focus:bg-white"
                                    />
                                </div>
                                <div className="w-32 space-y-2">
                                    <Label
                                        htmlFor="currency"
                                        className="px-1 text-xs font-black text-slate-500 uppercase"
                                    >
                                        Devise
                                    </Label>
                                    <Select
                                        value={currency}
                                        onValueChange={setCurrency}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map((c) => (
                                                <SelectItem
                                                    key={c}
                                                    value={c}
                                                    className="font-bold"
                                                >
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Motive (Description) */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="description"
                                    className="px-1 text-xs font-black text-slate-500 uppercase"
                                >
                                    Motif du mouvement
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Pourquoi ce mouvement ? (ex: Approvisionnement, Frais divers...)"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50 font-medium transition-all focus:bg-white"
                                />
                            </div>

                            {/* Performer Name */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="performedBy"
                                    className="px-1 text-xs font-black text-slate-500 uppercase"
                                >
                                    Effectué par (Nom)
                                </Label>
                                <Input
                                    id="performedBy"
                                    placeholder="Nom de la personne (ex: Jean-Luc, Manager...)"
                                    value={performedBy}
                                    onChange={(e) =>
                                        setPerformedBy(e.target.value)
                                    }
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 font-medium transition-all focus:bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-100 bg-slate-50/80 p-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-200"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={`h-12 rounded-xl px-8 font-black text-white shadow-lg transition-all active:scale-95 ${
                                type === 'deposit'
                                    ? 'bg-green-600 shadow-green-200 hover:bg-green-700'
                                    : 'bg-red-600 shadow-red-200 hover:bg-red-700'
                            }`}
                        >
                            {isLoading
                                ? 'Enregistrement...'
                                : 'Valider le Mouvement'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
