import { base44, Institution } from '@/api/base44Client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CashRegister } from '@/types/cash';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Landmark, Smartphone, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    register: CashRegister | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CURRENCIES = ['USD', 'CDF', 'EUR'];

// A stable reference for the "no data yet" case - `data: institutions = []`
// would create a brand new array every render while loading, which then
// breaks the useMemo below (new reference in, new reference out) and loops
// the effect that depends on it forever (React error #185).
const EMPTY_INSTITUTIONS: Institution[] = [];

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
    const [institutionAmounts, setInstitutionAmounts] = useState<
        Record<number, string>
    >({});
    const [institutionCurrencies, setInstitutionCurrencies] = useState<
        Record<number, string>
    >({});

    const { data: institutions = EMPTY_INSTITUTIONS } = useQuery<
        Institution[]
    >({
        queryKey: ['institutions', 'active'],
        queryFn: () => base44.entities.Institution.active(),
        enabled: isOpen,
    });

    // Only offer float declaration for mobile-money/bank operators, not
    // generic payment partners with no float concept. Memoized: an inline
    // filter() would return a new array every render and, being a dependency
    // of the effect below, loop it forever.
    const floatInstitutions = useMemo(
        () =>
            institutions.filter((inst) =>
                ['mobile_money', 'bank'].includes(inst.type),
            ),
        [institutions],
    );

    const mobileMoneyInstitutions = useMemo(
        () => floatInstitutions.filter((inst) => inst.type === 'mobile_money'),
        [floatInstitutions],
    );
    const bankInstitutions = useMemo(
        () => floatInstitutions.filter((inst) => inst.type === 'bank'),
        [floatInstitutions],
    );

    useEffect(() => {
        if (!isOpen) return;
        setInstitutionCurrencies((prev) => {
            const next = { ...prev };
            floatInstitutions.forEach((inst) => {
                if (!next[inst.id]) next[inst.id] = 'CDF';
            });
            return next;
        });
    }, [isOpen, floatInstitutions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!register) return;

        setIsLoading(true);
        try {
            const opening_institution_balances = floatInstitutions
                .filter((inst) => Number(institutionAmounts[inst.id]) > 0)
                .map((inst) => ({
                    institution_id: inst.id,
                    currency: institutionCurrencies[inst.id] || 'CDF',
                    amount: Number(institutionAmounts[inst.id]),
                }));

            await axios.post('/api/cash/sessions', {
                cash_register_id: register.id,
                opening_amounts: amounts,
                opening_institution_balances,
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

    const renderInstitutionRows = (insts: Institution[]) => (
        <div className="grid gap-3">
            <p className="-mt-1 text-xs text-slate-400">
                Optionnel - déclarez le solde que vous avez sur chaque compte
                partenaire pour suivre son équivalence en fin de journée.
            </p>
            {insts.map((inst) => (
                <div
                    key={inst.id}
                    className="grid grid-cols-4 items-center gap-4"
                >
                    <Label className="text-right text-sm font-medium">
                        {inst.name}
                    </Label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={institutionAmounts[inst.id] ?? ''}
                        onChange={(e) =>
                            setInstitutionAmounts({
                                ...institutionAmounts,
                                [inst.id]: e.target.value,
                            })
                        }
                        placeholder="0"
                        className="col-span-2"
                    />
                    <select
                        value={institutionCurrencies[inst.id] || 'CDF'}
                        onChange={(e) =>
                            setInstitutionCurrencies({
                                ...institutionCurrencies,
                                [inst.id]: e.target.value,
                            })
                        }
                        className="col-span-1 h-9 rounded-md border border-slate-200 text-sm"
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[560px]">
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
                    <Tabs defaultValue="cash">
                        <TabsList>
                            <TabsTrigger value="cash" className="gap-1.5">
                                <Wallet className="h-3.5 w-3.5" />
                                Espèces
                            </TabsTrigger>
                            {mobileMoneyInstitutions.length > 0 && (
                                <TabsTrigger
                                    value="mobile_money"
                                    className="gap-1.5"
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                    Mobile Money
                                </TabsTrigger>
                            )}
                            {bankInstitutions.length > 0 && (
                                <TabsTrigger value="bank" className="gap-1.5">
                                    <Landmark className="h-3.5 w-3.5" />
                                    Banque
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="cash" className="grid gap-4 pt-2">
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
                        </TabsContent>

                        {mobileMoneyInstitutions.length > 0 && (
                            <TabsContent value="mobile_money" className="pt-2">
                                {renderInstitutionRows(
                                    mobileMoneyInstitutions,
                                )}
                            </TabsContent>
                        )}

                        {bankInstitutions.length > 0 && (
                            <TabsContent value="bank" className="pt-2">
                                {renderInstitutionRows(bankInstitutions)}
                            </TabsContent>
                        )}
                    </Tabs>
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
