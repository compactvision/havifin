import { base44 } from '@/api/base44Client';
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
import { CashSession } from '@/types/cash';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    session: CashSession | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CURRENCIES = ['USD', 'CDF', 'EUR'];

export default function CloseSessionModal({
    session,
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
        if (!session) return;

        if (
            !confirm(
                'Êtes-vous sûr de vouloir clôturer cette caisse ? Cette action est irréversible.',
            )
        ) {
            return;
        }

        setIsLoading(true);
        try {
            await base44.entities.CashSession.close(session.id, {
                closing_amounts: amounts,
                notes: notes,
            });
            toast.success('Session clôturée avec succès');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || 'Erreur lors de la clôture',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Clôture de Caisse</DialogTitle>
                    <DialogDescription>
                        Veuillez compter et saisir le solde RÉEL pour la session
                        #{session?.id}. Tout écart sera enregistré.
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
                                    htmlFor={`close-amount-${currency}`}
                                    className="text-right font-bold"
                                >
                                    {currency}
                                </Label>
                                <Input
                                    id={`close-amount-${currency}`}
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
                        <Label htmlFor="close-notes" className="text-right">
                            Notes
                        </Label>
                        <Textarea
                            id="close-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3"
                            placeholder="Remarques sur la clôture..."
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
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Clôture...' : 'Clôturer la Caisse'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
