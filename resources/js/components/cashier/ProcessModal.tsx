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
import { usePrinter } from '@/hooks/usePrinter';
import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDownCircle,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpCircle,
    Calculator,
    CheckCircle,
    CreditCard,
    Loader2,
    Split,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
    paiement: {
        label: 'Paiement',
        icon: CreditCard,
        color: 'text-pink-500',
        action: 'Payer',
    },
};

interface ProcessModalProps {
    client: Client | null;
    open: boolean;
    onClose: () => void;
}

function requestedAmount(client: Client | null): string {
    if (!client) return '';

    const amount =
        client.operation_type === 'change'
            ? client.amount_from
            : (client.amount ?? client.amount_from);

    return Number(amount) >= 0.01 ? String(amount) : '';
}

export default function ProcessModal({
    client,
    open,
    onClose,
}: ProcessModalProps) {
    const { auth } = usePage().props as any;
    const { printTicket } = usePrinter();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        amount_from: requestedAmount(client),
        amount_given: '', // Montant reçu du client (pour dépôt/transfert)
        currency_from: client?.currency_from || 'USD',
        currency_to: client?.currency_to || 'CDF',
        exchange_rate: '',
        commission: '0',
        notes: '',
    });
    const [calculatedAmount, setCalculatedAmount] = useState(0);
    const [useSplitSettlement, setUseSplitSettlement] = useState(false);
    const [primaryCashAmount, setPrimaryCashAmount] = useState(
        requestedAmount(client),
    );
    const [secondaryCurrency, setSecondaryCurrency] = useState('');

    const { data: rates = [] } = useQuery<ExchangeRate[]>({
        queryKey: ['rates'],
        queryFn: () =>
            base44.entities.ExchangeRate.filter({ is_active: true } as any),
    });

    useEffect(() => {
        if (client) {
            setFormData((prev) => ({
                ...prev,
                amount_from: requestedAmount(client),
                currency_from: client.currency_from || 'USD',
                currency_to: client.currency_to || 'CDF',
                amount_given: '',
                exchange_rate: '',
                commission: '0',
            }));
            setUseSplitSettlement(false);
            setPrimaryCashAmount(requestedAmount(client));
            setSecondaryCurrency('');
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
                    exchange_rate: String(rate.rate ?? rate.buy_rate),
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

    const requestedSettlementAmount = Number(requestedAmount(client));
    const primarySettlementAmount = Number(primaryCashAmount) || 0;
    const remainingSettlementAmount = Math.max(
        requestedSettlementAmount - primarySettlementAmount,
        0,
    );
    const settlementRates = rates.filter(
        (rate) =>
            rate.currency_from === formData.currency_from &&
            rate.currency_to !== formData.currency_from,
    );
    const selectedSettlementRate = settlementRates.find(
        (rate) => rate.currency_to === secondaryCurrency,
    );
    const secondarySettlementAmount = selectedSettlementRate
        ? remainingSettlementAmount * Number(selectedSettlementRate.rate)
        : 0;
    const splitSettlementIsValid =
        !useSplitSettlement ||
        (primarySettlementAmount >= 0 &&
            primarySettlementAmount < requestedSettlementAmount &&
            remainingSettlementAmount >= 0.01 &&
            Boolean(selectedSettlementRate));

    const completeMutation = useMutation({
        mutationFn: async () => {
            if (!client) return;
            // Create transaction
            const finalCalculatedAmount = isNaN(calculatedAmount)
                ? 0
                : calculatedAmount;
            const finalExchangeRate =
                client.operation_type === 'change'
                    ? parseFloat(formData.exchange_rate) || 0
                    : 1;

            if (
                isNaN(finalExchangeRate) ||
                (client.operation_type === 'change' && finalExchangeRate === 0)
            ) {
                throw new Error('Taux de change invalide');
            }

            const tx = await base44.entities.Transaction.create({
                client_id: client.id,
                ticket_number: client.ticket_number,
                operation_type: client.operation_type,
                service: client.service,
                currency_from: formData.currency_from,
                currency_to:
                    client.operation_type === 'change'
                        ? formData.currency_to
                        : formData.currency_from,
                amount_from: parseFloat(formData.amount_from) || 0,
                amount_to:
                    client.operation_type === 'change'
                        ? finalCalculatedAmount
                        : parseFloat(formData.amount_from) || 0,
                exchange_rate: finalExchangeRate,
                commission: parseFloat(formData.commission) || 0,
                client_phone: client.phone,
                settlement: useSplitSettlement
                    ? {
                          primary_amount: primarySettlementAmount,
                          secondary_currency: secondaryCurrency,
                      }
                    : undefined,
            });

            // Update client status
            await base44.entities.Client.update(client.id, {
                status: 'completed',
                completed_at: new Date().toISOString(),
                notes: formData.notes,
            } as any);

            return tx;
        },
        onSuccess: (tx) => {
            // Lancement automatique de l'impression
            const ticketRef =
                (tx as any)?.reference ||
                client?.ticket_number ||
                'TRX-DEFAULT';

            const settlementItems = tx?.settlement_breakdown?.map((line) => ({
                name: `Règlement en ${line.currency}`,
                amount: Number(line.amount).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                }),
            }));

            printTicket({
                shopName: auth?.user?.shop || 'Havifin',
                address: `Caisse: ${auth?.user?.name || 'Agence Havifin'}`,
                reference: ticketRef,
                date: new Date().toLocaleString(),
                amount: String(formData.amount_from),
                currency: formData.currency_from,
                items:
                    settlementItems && settlementItems.length > 0
                        ? settlementItems
                        : [
                              {
                                  name: `Op: ${client?.operation_type}`,
                                  amount: String(formData.amount_from),
                              },
                          ],
            });

            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            onClose();
        },
        onError: (error: any) => {
            const validationErrors = error.response?.data?.errors;
            const firstValidationError = validationErrors
                ? Object.values(validationErrors).flat()[0]
                : null;
            const message =
                firstValidationError ||
                error.response?.data?.message ||
                error.message ||
                'Impossible de traiter cette opération';

            toast.error(String(message));
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
                                    min="0.01"
                                    step="0.01"
                                    required
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

                        {['depot', 'retrait'].includes(
                            client.operation_type,
                        ) && (
                            <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseSplitSettlement(
                                            !useSplitSettlement,
                                        );
                                        setPrimaryCashAmount(
                                            requestedAmount(client),
                                        );
                                        setSecondaryCurrency('');
                                    }}
                                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left font-bold transition-colors ${
                                        useSplitSettlement
                                            ? 'border-indigo-500 bg-indigo-600 text-white'
                                            : 'border-indigo-100 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Split className="h-5 w-5" />
                                        Règlement en deux devises
                                    </span>
                                    <span className="text-xs">
                                        {useSplitSettlement
                                            ? 'Activé'
                                            : 'Configurer'}
                                    </span>
                                </button>

                                {useSplitSettlement && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label>
                                                Montant{' '}
                                                {client.operation_type ===
                                                'retrait'
                                                    ? 'remis'
                                                    : 'reçu'}{' '}
                                                en {formData.currency_from}
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max={requestedSettlementAmount}
                                                step="0.01"
                                                value={primaryCashAmount}
                                                onChange={(event) =>
                                                    setPrimaryCashAmount(
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-1 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <Label>
                                                Deuxième devise pour les{' '}
                                                {remainingSettlementAmount.toLocaleString()}{' '}
                                                {formData.currency_from}{' '}
                                                restants
                                            </Label>
                                            <Select
                                                value={secondaryCurrency}
                                                onValueChange={
                                                    setSecondaryCurrency
                                                }
                                            >
                                                <SelectTrigger className="mt-1 bg-white">
                                                    <SelectValue placeholder="Choisir la deuxième devise" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {settlementRates.map(
                                                        (rate) => (
                                                            <SelectItem
                                                                key={rate.id}
                                                                value={
                                                                    rate.currency_to
                                                                }
                                                            >
                                                                {
                                                                    rate.currency_to
                                                                }{' '}
                                                                — 1{' '}
                                                                {
                                                                    rate.currency_from
                                                                }{' '}
                                                                = {rate.rate}{' '}
                                                                {
                                                                    rate.currency_to
                                                                }
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {selectedSettlementRate ? (
                                            <div className="rounded-xl bg-white p-4">
                                                <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                    Deuxième montant{' '}
                                                    {client.operation_type ===
                                                    'retrait'
                                                        ? 'à remettre'
                                                        : 'à recevoir'}
                                                </div>
                                                <div className="mt-1 text-2xl font-black text-indigo-700">
                                                    {secondarySettlementAmount.toLocaleString(
                                                        undefined,
                                                        {
                                                            maximumFractionDigits: 2,
                                                        },
                                                    )}{' '}
                                                    {secondaryCurrency}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    Calculé avec le taux
                                                    configuré par le manager.
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-semibold text-amber-700">
                                                Aucun taux direct disponible
                                                depuis {formData.currency_from}.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Depot / Transfert Specific: Amount Given & Change */}
                        {['depot', 'transfert'].includes(
                            client.operation_type,
                        ) &&
                            !(
                                useSplitSettlement &&
                                client.operation_type === 'depot'
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
                                                    amount_given:
                                                        e.target.value,
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
                                !formData.amount_from ||
                                !splitSettlementIsValid
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
