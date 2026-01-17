import { base44, Client, ExchangeRate } from '@/api/base44Client';
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
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDownCircle,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpCircle,
    Calculator,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const operationConfig = {
    depot: {
        label: 'Dépôt',
        icon: ArrowDownCircle,
        color: 'text-green-500',
        action: 'Déposer',
    },
    retrait: {
        label: 'Retrait',
        icon: ArrowUpCircle,
        color: 'text-blue-500',
        action: 'Retirer',
    },
    change: {
        label: 'Change',
        icon: ArrowLeftRight,
        color: 'text-amber-500',
        action: 'Changer',
    },
    transfert: {
        label: 'Transfert',
        icon: ArrowRight,
        color: 'text-purple-500',
        action: 'Transférer',
    },
};

interface ProcessModalProps {
    client: Client | null;
    open: boolean;
    onClose: () => void;
}

export default function ProcessModal({
    client,
    open,
    onClose,
}: ProcessModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        amount_from: client?.amount ? String(client.amount) : '', // Montant de l'opération (ex: montant à déposer)
        amount_given: '', // Montant reçu du client (pour dépôt/transfert)
        currency_from: client?.currency_from || 'USD',
        currency_to: client?.currency_to || 'CDF',
        exchange_rate: '',
        commission: 0,
        notes: '',
    });
    const [calculatedAmount, setCalculatedAmount] = useState(0);

    const { data: rates = [] } = useQuery<ExchangeRate[]>({
        queryKey: ['rates'],
        queryFn: () =>
            base44.entities.ExchangeRate.filter({ is_active: true } as any),
    });

    useEffect(() => {
        if (client) {
            setFormData((prev) => ({
                ...prev,
                amount_from: client.amount ? String(client.amount) : '',
                currency_from: client.currency_from || 'USD',
                currency_to: client.currency_to || 'CDF',
                amount_given: '',
                exchange_rate: '',
            }));
        }
    }, [client]);

    // Auto-fill exchange rate
    useEffect(() => {
        if (client?.operation_type === 'change') {
            const pair = `${formData.currency_from}_${formData.currency_to}`;
            const rate = rates.find(
                (r) =>
                    r.currency_pair === pair ||
                    (r.currency_from === formData.currency_from &&
                        r.currency_to === formData.currency_to),
            );
            if (rate) {
                setFormData((prev) => ({
                    ...prev,
                    exchange_rate: String(rate.buy_rate || rate.rate),
                }));
            }
        }
    }, [
        formData.currency_from,
        formData.currency_to,
        rates,
        client?.operation_type,
    ]);

    // Calculation Logic
    useEffect(() => {
        if (!formData.amount_from) return;

        const amount = parseFloat(formData.amount_from);
        const given = parseFloat(formData.amount_given) || 0;
        const rate = parseFloat(formData.exchange_rate) || 1;
        const commission = parseFloat(formData.commission) || 0;

        if (client?.operation_type === 'change') {
            // Change: Amount * Rate - Commission
            setCalculatedAmount(amount * rate - commission);
        } else if (
            ['depot', 'transfert'].includes(client?.operation_type || '')
        ) {
            // Depot: Change to return = Given - Deposit
            if (given > 0) {
                setCalculatedAmount(given - amount - commission);
            } else {
                setCalculatedAmount(0);
            }
        } else {
            setCalculatedAmount(0);
        }
    }, [
        formData.amount_from,
        formData.amount_given,
        formData.exchange_rate,
        formData.commission,
        client?.operation_type,
    ]);

    const completeMutation = useMutation({
        mutationFn: async () => {
            if (!client) return;
            // Create transaction
            await base44.entities.Transaction.create({
                client_id: client.id,
                ticket_number: client.ticket_number,
                operation_type: client.operation_type,
                service: client.service,
                currency_from: formData.currency_from,
                currency_to:
                    client.operation_type === 'change'
                        ? formData.currency_to
                        : formData.currency_from, // Same currency for non-change
                amount_from: parseFloat(formData.amount_from),
                amount_to:
                    client.operation_type === 'change'
                        ? calculatedAmount
                        : parseFloat(formData.amount_from),
                exchange_rate:
                    client.operation_type === 'change'
                        ? parseFloat(formData.exchange_rate)
                        : 1,
                commission: parseFloat(formData.commission) || 0,
                client_phone: client.phone,
            });

            // Update client status
            await base44.entities.Client.update(client.id, {
                status: 'completed',
                completed_at: new Date().toISOString(),
                notes: formData.notes,
            } as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            onClose();
        },
    });

    if (!client) return null;

    const opType = client.operation_type as keyof typeof operationConfig;
    const config = operationConfig[opType] || operationConfig.depot;
    const Icon = config.icon;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-slate-800">
                                {client.ticket_number}
                            </span>
                            <span
                                className={`flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium ${config.color}`}
                            >
                                <Icon className="h-4 w-4" />
                                {config.label}
                            </span>
                        </div>
                        <span className="text-sm font-normal text-slate-500">
                            {client.phone}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Service Info */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <div>
                            <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                Service
                            </div>
                            <div className="text-lg font-bold text-slate-800">
                                {client.service === 'bureau'
                                    ? 'Bureau de Change'
                                    : client.service}
                            </div>
                        </div>
                        {['depot', 'transfert', 'retrait'].includes(
                            client.operation_type,
                        ) && (
                            <div className="text-right">
                                <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                    Devise
                                </div>
                                <div className="text-lg font-bold text-slate-800">
                                    {formData.currency_from}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Common Input: Main Amount */}
                        <div>
                            <Label>
                                {client.operation_type === 'retrait'
                                    ? 'Montant à retirer'
                                    : "Montant de l'opération"}
                            </Label>
                            <div className="mt-1 flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={formData.amount_from}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount_from: e.target.value,
                                        })
                                    }
                                    className="text-lg font-bold"
                                />
                                {['depot', 'transfert', 'retrait'].includes(
                                    client.operation_type,
                                ) && (
                                    <Select
                                        value={formData.currency_from}
                                        onValueChange={(v) =>
                                            setFormData({
                                                ...formData,
                                                currency_from: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">
                                                USD
                                            </SelectItem>
                                            <SelectItem value="CDF">
                                                CDF
                                            </SelectItem>
                                            <SelectItem value="EUR">
                                                EUR
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        {/* Depot / Transfert Specific: Amount Given & Change */}
                        {['depot', 'transfert'].includes(
                            client.operation_type,
                        ) && (
                            <>
                                <div>
                                    <Label>Montant reçu du client</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount_given}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                amount_given: e.target.value,
                                            })
                                        }
                                        className="mt-1"
                                        placeholder="Combien le client a donné ?"
                                    />
                                </div>
                                {calculatedAmount > 0 && (
                                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                        <div className="mb-1 flex items-center gap-2 text-yellow-700">
                                            <Calculator className="h-4 w-4" />
                                            <span className="font-bold">
                                                A rendre au client
                                            </span>
                                        </div>
                                        <div className="text-2xl font-black text-yellow-600">
                                            {calculatedAmount.toLocaleString()}{' '}
                                            {formData.currency_from}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Change Specific */}
                        {client.operation_type === 'change' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Devise Source</Label>
                                    <Select
                                        value={formData.currency_from}
                                        onValueChange={(v) =>
                                            setFormData({
                                                ...formData,
                                                currency_from: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">
                                                USD
                                            </SelectItem>
                                            <SelectItem value="CDF">
                                                CDF
                                            </SelectItem>
                                            <SelectItem value="EUR">
                                                EUR
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Devise Cible</Label>
                                    <Select
                                        value={formData.currency_to}
                                        onValueChange={(v) =>
                                            setFormData({
                                                ...formData,
                                                currency_to: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">
                                                USD
                                            </SelectItem>
                                            <SelectItem value="CDF">
                                                CDF
                                            </SelectItem>
                                            <SelectItem value="EUR">
                                                EUR
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label>Taux de change</Label>
                                    <Input
                                        type="number"
                                        value={formData.exchange_rate}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                exchange_rate: e.target.value,
                                            })
                                        }
                                        className="mt-1"
                                    />
                                </div>
                                <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="mb-1 font-bold text-amber-700">
                                        Montant à remettre
                                    </div>
                                    <div className="text-3xl font-black text-amber-600">
                                        {calculatedAmount.toLocaleString()}{' '}
                                        {formData.currency_to}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label>Notes (optionnel)</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    notes: e.target.value,
                                })
                            }
                            className="mt-1"
                            placeholder="Remarques..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={() => completeMutation.mutate()}
                            disabled={
                                completeMutation.isPending ||
                                !formData.amount_from
                            }
                            className={`flex-1 text-white ${client.operation_type === 'depot' || client.operation_type === 'transfert' ? 'bg-green-600 hover:bg-green-700' : client.operation_type === 'retrait' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                            {completeMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Valider {config.label}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
