import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
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
import { Link } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ManualCashMovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shopId: number | null;
    selectedDate: string;
}

const initialForm = {
    cash_session_id: '',
    type: 'adjustment_in',
    amount: '',
    currency: 'USD',
    description: '',
};

export function ManualCashMovementDialog({
    open,
    onOpenChange,
    shopId,
    selectedDate,
}: ManualCashMovementDialogProps) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(initialForm);

    const { data: openSessions = [], isLoading } = useQuery({
        queryKey: ['open-cash-sessions', shopId],
        queryFn: () =>
            base44.entities.CashSession.list({
                shop_id: shopId,
                status: 'open',
            }),
        enabled: open && !!shopId,
    });

    useEffect(() => {
        if (openSessions.length === 1 && !form.cash_session_id) {
            setForm((current) => ({
                ...current,
                cash_session_id: String(openSessions[0].id),
            }));
        }
    }, [form.cash_session_id, openSessions]);

    const createMovement = useMutation({
        mutationFn: () =>
            base44.entities.CashMovement.store({
                ...form,
                cash_session_id: Number(form.cash_session_id),
                amount: Number(form.amount),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['all-cash-movements', selectedDate, shopId],
            });
            setForm(initialForm);
            onOpenChange(false);
            toast.success('Mouvement manuel enregistré');
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message ||
                    "Impossible d'enregistrer le mouvement",
            );
        },
    });

    const canSubmit =
        form.cash_session_id !== '' &&
        Number(form.amount) > 0 &&
        form.description.trim() !== '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Enregistrer un mouvement manuel</DialogTitle>
                </DialogHeader>

                {openSessions.length === 0 && !isLoading ? (
                    // A movement has to belong to an open till for the balances
                    // to add up, so point at the way out instead of dead-ending:
                    // a manager can open a counter's till themselves.
                    <div className="space-y-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                            Aucune caisse n’est ouverte dans cette boutique. Un
                            mouvement doit être rattaché à une caisse ouverte
                            pour rester traçable.
                        </div>
                        <p className="text-sm text-slate-500">
                            Ouvrez la caisse d’un guichet — vous pouvez le faire
                            vous-même en tant que manager, sans attendre le
                            caissier — puis revenez enregistrer le mouvement.
                        </p>
                        <Button
                            asChild
                            className="w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
                        >
                            <Link href="/cash/dashboard">
                                Ouvrir une caisse
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <form
                        className="space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (canSubmit) createMovement.mutate();
                        }}
                    >
                        <div className="space-y-2">
                            <Label>Caisse concernée</Label>
                            <Select
                                value={form.cash_session_id}
                                onValueChange={(value) =>
                                    setForm({
                                        ...form,
                                        cash_session_id: value,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une caisse ouverte" />
                                </SelectTrigger>
                                <SelectContent>
                                    {openSessions.map((session) => (
                                        <SelectItem
                                            key={session.id}
                                            value={String(session.id)}
                                        >
                                            {session.register?.name ||
                                                `Caisse ${session.cash_register_id}`}
                                            {session.user?.name
                                                ? ` — ${session.user.name}`
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nature</Label>
                                <Select
                                    value={form.type}
                                    onValueChange={(value) =>
                                        setForm({ ...form, type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="adjustment_in">
                                            Entrée d’argent
                                        </SelectItem>
                                        <SelectItem value="adjustment_out">
                                            Sortie d’argent
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Devise</Label>
                                <Select
                                    value={form.currency}
                                    onValueChange={(value) =>
                                        setForm({ ...form, currency: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="CDF">CDF</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manual-movement-amount">
                                Montant
                            </Label>
                            <Input
                                id="manual-movement-amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        amount: event.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manual-movement-description">
                                Motif
                            </Label>
                            <Input
                                id="manual-movement-description"
                                value={form.description}
                                maxLength={1000}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        description: event.target.value,
                                    })
                                }
                                placeholder="Ex. Approvisionnement exceptionnel"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !canSubmit || createMovement.isPending
                                }
                            >
                                {createMovement.isPending
                                    ? 'Enregistrement…'
                                    : 'Enregistrer'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
