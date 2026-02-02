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
import { CashRegister } from '@/types/cash';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    register: CashRegister | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CURRENCIES = ['USD', 'CDF', 'EUR'];

export default function OpenSessionModal({
    register,
    isOpen,
    onClose,
    onSuccess,
}: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [amounts, setAmounts] = useState<Record<string, string>>({
        USD: '0',
        CDF: '0',
        EUR: '0',
    });
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!register) return;

        setIsLoading(true);
        try {
            await axios.post('/api/cash/sessions', {
                cash_register_id: register.id,
                opening_amounts: amounts,
                notes: notes,
            });
            toast.success('Session ouverte avec succès');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Erreur lors de l'ouverture",
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        Ouverture de Caisse - Fond de Caisse
                    </DialogTitle>
                    <DialogDescription>
                        Veuillez renseigner le <strong>montant prévu</strong>{' '}
                        pour le début de journée (Fond de Caisse) pour{' '}
                        {register?.name}.
                        <br />
                        Ces montants constitueront le solde d'ouverture.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-4">
                        {CURRENCIES.map((currency) => (
                            <div
                                key={currency}
                                className="grid grid-cols-4 items-center gap-4"
                            >
                                <Label
                                    htmlFor={`amount-${currency}`}
                                    className="text-right font-bold"
                                >
                                    {currency}
                                </Label>
                                <Input
                                    id={`amount-${currency}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amounts[currency]}
                                    onChange={(e) =>
                                        setAmounts({
                                            ...amounts,
                                            [currency]: e.target.value,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3"
                            placeholder="Remarques éventuelles..."
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Ouverture...' : 'Ouvrir la session'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
