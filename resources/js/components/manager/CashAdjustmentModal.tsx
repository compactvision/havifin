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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface CashAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: number;
}

export default function CashAdjustmentModal({
    isOpen,
    onClose,
    sessionId,
}: CashAdjustmentModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        type: 'adjustment_in',
        amount: '',
        currency: 'USD',
        description: '',
    });

    const adjustmentMutation = useMutation({
        mutationFn: (data: any) =>
            base44.entities.CashMovement.store({
                ...data,
                cash_session_id: sessionId,
            }),
        onSuccess: () => {
            toast.success('Ajustement effectué avec succès');
            queryClient.invalidateQueries({
                queryKey: ['cash-session', sessionId],
            });
            queryClient.invalidateQueries({
                queryKey: ['cash-session-report', sessionId],
            });
            onClose();
            setFormData({
                type: 'adjustment_in',
                amount: '',
                currency: 'USD',
                description: '',
            });
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message || 'Erreur lors de l’ajustement',
            );
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.description) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }
        adjustmentMutation.mutate({
            ...formData,
            amount: parseFloat(formData.amount),
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="rounded-[2.5rem] sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase">
                            Ajustement de Caisse
                        </DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Ajouter ou retirer manuellement des fonds de la
                            caisse.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">
                                Type d'ajustement
                            </Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) =>
                                    setFormData({ ...formData, type: v })
                                }
                            >
                                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-bold">
                                    <SelectValue placeholder="Choisir un type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100">
                                    <SelectItem
                                        value="adjustment_in"
                                        className="rounded-xl font-bold text-green-600"
                                    >
                                        + Entrée de fonds (Apport)
                                    </SelectItem>
                                    <SelectItem
                                        value="adjustment_out"
                                        className="rounded-xl font-bold text-red-600"
                                    >
                                        - Sortie de fonds (Retrait)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">
                                    Montant
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-bold"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">
                                    Devise
                                </Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(v) =>
                                        setFormData({
                                            ...formData,
                                            currency: v,
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-bold">
                                        <SelectValue placeholder="USD" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100">
                                        <SelectItem
                                            value="USD"
                                            className="rounded-xl font-bold"
                                        >
                                            USD
                                        </SelectItem>
                                        <SelectItem
                                            value="CDF"
                                            className="rounded-xl font-bold"
                                        >
                                            CDF
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">
                                Description / Motif
                            </Label>
                            <Input
                                placeholder="Ex: Erreur de décompte, apport manager..."
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-bold"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-2xl font-bold text-slate-500"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={adjustmentMutation.isPending}
                            className={`h-12 rounded-2xl px-8 font-black tracking-widest uppercase ${
                                formData.type === 'adjustment_in'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {adjustmentMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Valider l'ajustement"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
