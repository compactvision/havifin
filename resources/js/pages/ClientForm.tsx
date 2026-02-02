import { base44, Client, ClientPhone } from '@/api/base44Client';
import ExchangeCalculator from '@/components/client/ExchangeCalculator';
import MultiPhoneSelector from '@/components/client/MultiPhoneSelector';
import OperationSelector from '@/components/client/OperationSelector';
import ServiceSelector from '@/components/client/ServiceSelector';
import TicketSuccess from '@/components/client/TicketSuccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppMain from '@/layouts/app-main';
import { Head, usePage } from '@inertiajs/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    Building2,
    ChevronLeft,
    Clock as ClockIcon,
    Copy,
    Info,
    Loader2,
    Lock as LockIcon,
    Phone,
    Search,
    ShieldCheck,
    Store as StoreIcon,
} from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ClientForm() {
    const { auth } = usePage().props as any;
    const [step, setStep] = useState(1);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [existingClient, setExistingClient] = useState<Client | null>(null);
    const [showRegistration, setShowRegistration] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [showLinkAccount, setShowLinkAccount] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Client[]>([]);

    const [isSearching, setIsSearching] = useState(false);
    const [showPhoneSelector, setShowPhoneSelector] = useState(false);

    const { data: institutions = [], isPending: isLoadingInstitutions } =
        useQuery({
            queryKey: ['institutions', 'active'],
            queryFn: () => base44.entities.Institution.active(),
        });

    // Fetch current session status
    const { data: currentSession, isLoading: isLoadingSession } = useQuery({
        queryKey: ['current-session'],
        queryFn: () => base44.entities.Session.current(),
        refetchInterval: 10000, // Check every 10s for kiosks
    });

    const [formData, setFormData] = useState({
        phone: '',
        operation_type: '',
        institution_id: undefined as number | undefined,
        first_name: '',
        last_name: '',
        email: '',
        address: '',
        amount: '',
        currency: 'USD',
        reason: '',
        beneficiary: '',
        beneficiary_number: '',
        account_number: '',
        currency_from: '',
        currency_to: '',
        amount_from: 0,
        exchange_rate: 0,
        metadata: {} as Record<string, string>,
    });

    // Handle phone verification when 10 digits are reached
    useEffect(() => {
        const verify = async () => {
            if (
                formData.phone.length === 10 &&
                !existingClient &&
                !showRegistration
            ) {
                setIsVerifying(true);
                try {
                    const response = (await base44.entities.Client.verifyPhone(
                        formData.phone,
                    )) as { exists: boolean; client?: Client };
                    if (response.exists && response.client) {
                        setExistingClient(response.client);
                        setFormData((prev) => ({
                            ...prev,
                            phone: formData.phone,
                        }));
                        setStep(2);
                        setShowRegistration(false);
                    } else {
                        setExistingClient(null);
                        setShowRegistration(true);
                    }
                } catch (error) {
                    console.error('Phone verification failed:', error);
                } finally {
                    setIsVerifying(false);
                }
            }
        };

        verify();
    }, [formData.phone, existingClient, showRegistration]);

    const registerMutation = useMutation({
        mutationFn: async () => {
            const response = (await base44.entities.Client.register({
                phone: formData.phone,
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                address: formData.address,
            })) as { success: boolean; client: Client };
            return response.client;
        },
        onSuccess: (client) => {
            setExistingClient(client);
            setShowRegistration(false);
            setStep(2);
        },
    });

    const addPhoneMutation = useMutation({
        mutationFn: async (phone_number: string) => {
            if (!existingClient) return;
            const response = (await base44.entities.Client.addPhone(
                existingClient.id,
                phone_number,
            )) as { success: boolean; phone: ClientPhone };
            return response.phone;
        },
        onSuccess: (newPhone) => {
            if (existingClient && newPhone) {
                setExistingClient({
                    ...existingClient,
                    phones: [...(existingClient.phones || []), newPhone],
                });
            }
        },
    });

    const createClientMutation = useMutation({
        mutationFn: async (data: any) => {
            // Ticket generated by backend
            const clientData = {
                ...data,
                phone: formData.phone,
                // ticket_number: ticket, // Removed
                status: 'waiting',
                first_name:
                    existingClient?.first_name || data.first_name || 'Client',
                last_name:
                    existingClient?.last_name || data.last_name || 'Anonyme',
                is_registered: !!existingClient && !isAnonymous,
                metadata: formData.metadata,
            };
            const response = await base44.entities.Client.create(clientData);
            return response.ticket_number;
        },
        onSuccess: (ticket) => {
            setTicketNumber(ticket);
            setStep(3);
        },
        onError: (error: any) => {
            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Une erreur est survenue lors de la création du ticket';
            toast.error(message);
        },
    });

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        setIsSearching(true);
        try {
            const results = await base44.entities.Client.filter({
                first_name: searchQuery,
            });
            // Also try searching by last name if needed or combine
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleLinkAccount = async (client: Client) => {
        try {
            await addPhoneMutation.mutateAsync(formData.phone);
            // After linking, we need to update the client with the new phone list in the UI
            // But addPhoneMutation success handler only updates if existingClient is set.
            // Here existingClient is null.
            // So we manually set existingClient with the new phone included (optimistically or fetch)
            // Actually addPhoneMutation requires existingClient.id.
            // So we must hack this:
            const response = (await base44.entities.Client.addPhone(
                client.id,
                formData.phone,
            )) as { success: boolean; phone: ClientPhone };

            if (response.success && response.phone) {
                setExistingClient({
                    ...client,
                    phones: [...(client.phones || []), response.phone],
                });
                setShowLinkAccount(false);
                setShowRegistration(false);
                setStep(2);
            }
        } catch (error) {
            console.error('Failed to link account', error);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (showRegistration) {
                registerMutation.mutate();
            } else if (existingClient) {
                setStep(2);
            }
        } else if (step === 2) {
            if (formData.operation_type === 'change') {
                createClientMutation.mutate({
                    ...formData,
                    service: 'bureau',
                    amount: formData.amount
                        ? Number(formData.amount)
                        : undefined,
                    amount_from: formData.amount_from,
                    exchange_rate: formData.exchange_rate,
                    currency_from: formData.currency_from,
                    currency_to: formData.currency_to,
                });
            } else if (formData.operation_type && formData.institution_id) {
                const inst = institutions.find(
                    (i) => i.id === formData.institution_id,
                );
                createClientMutation.mutate({
                    ...formData,
                    operation_type: formData.operation_type,
                    service: inst?.name || '',
                    currency_from: formData.currency,
                    amount: formData.amount
                        ? Number(formData.amount)
                        : undefined,
                    notes: `Motif: ${formData.reason}${formData.beneficiary ? ` | Bénéficiaire: ${formData.beneficiary}` : ''}${formData.beneficiary_number ? ` | Numéro Bénéficiaire: ${formData.beneficiary_number}` : ''}${formData.account_number ? ` | Compte: ${formData.account_number}` : ''}`,
                });
            }
        }
    };

    const handleNewTicket = () => {
        setStep(1);
        toggleReset();
    };

    const toggleReset = () => {
        setTicketNumber(null);
        setExistingClient(null);
        setShowRegistration(false);
        setIsAnonymous(false);
        setShowLinkAccount(false);
        setShowPhoneSelector(false);
        setSearchQuery('');
        setSearchResults([]);
        setFormData({
            phone: '',
            operation_type: '',
            institution_id: undefined,
            first_name: '',
            last_name: '',
            email: '',
            address: '',
            amount: '',
            currency: 'USD',
            reason: '',
            beneficiary: '',
            beneficiary_number: '',
            account_number: '',
            currency_from: '',
            currency_to: '',
            amount_from: 0,
            exchange_rate: 0,
            metadata: {},
        });
    };

    const canProceed = () => {
        if (step === 1) {
            if (showRegistration) {
                return (
                    formData.first_name.trim() !== '' &&
                    formData.last_name.trim() !== ''
                );
            }
            return !!existingClient;
        }
        if (step === 2) {
            if (formData.operation_type === 'change')
                return !!(
                    formData.amount &&
                    formData.amount_from &&
                    formData.exchange_rate
                );

            if (formData.operation_type === 'paiement') return true;

            const hasBasicFields = !!(
                formData.operation_type && formData.institution_id
            );
            if (!hasBasicFields) return false;

            if (
                formData.operation_type === 'depot' ||
                formData.operation_type === 'retrait'
            ) {
                const inst = institutions.find(
                    (i) => i.id === formData.institution_id,
                );
                const hasAmount = !!formData.amount;

                // For withdrawals, only amount is required
                if (formData.operation_type === 'retrait') {
                    return hasAmount;
                }

                // Dynamic validation based on institution settings
                const settings = (inst as any)?.settings;
                if (settings?.required_fields || settings?.custom_fields) {
                    const required = settings?.required_fields || [];
                    const checks: boolean[] = [hasAmount];

                    if (required.includes('account_number'))
                        checks.push(!!formData.account_number);
                    if (required.includes('beneficiary'))
                        checks.push(!!formData.beneficiary);
                    if (required.includes('beneficiary_number'))
                        checks.push(!!formData.beneficiary_number);
                    if (required.includes('reason'))
                        checks.push(!!formData.reason);

                    // Check custom fields (filter by operation type)
                    const customFields = (settings?.custom_fields || []).filter(
                        (f: any) =>
                            !f.operation_type ||
                            f.operation_type === 'both' ||
                            f.operation_type === formData.operation_type,
                    );
                    customFields.forEach((f: any) => {
                        checks.push(!!formData.metadata[f.id]);
                    });

                    return checks.every(Boolean);
                }

                // Fallback to defaults if no settings configured
                if (inst?.type === 'bank') {
                    return !!(
                        hasAmount &&
                        formData.account_number &&
                        formData.beneficiary
                    );
                }
                return !!(
                    hasAmount &&
                    formData.beneficiary &&
                    formData.beneficiary_number
                );
            }

            return true;
        }
        return true;
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-8"
                    >
                        <div className="text-center">
                            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/20 bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 shadow-xl shadow-brand-purple/20 backdrop-blur-xl transition-transform group-hover:scale-110">
                                <Phone className="h-12 w-12 text-brand-dark transition-transform group-hover:rotate-12" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tight text-slate-800 drop-shadow-sm">
                                {showRegistration
                                    ? 'Nouvelle Inscription'
                                    : 'Bienvenue chez Havifin'}
                            </h2>
                            <p className="mt-3 text-lg font-bold tracking-[0.2em] text-brand-blue uppercase">
                                {auth.user?.shop}
                            </p>
                            <p className="mt-2 text-lg font-medium text-slate-600">
                                {showRegistration
                                    ? 'Laissez-nous faire connaissance pour mieux vous servir'
                                    : 'Identifiez-vous pour commencer votre opération'}
                            </p>
                        </div>

                        <div className="mx-auto max-w-lg space-y-6">
                            {!existingClient && !showRegistration && (
                                <div className="group relative">
                                    <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-brand-cyan/40 via-brand-purple/40 to-brand-pink/40 opacity-60 blur-xl transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                                    <Input
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                phone: e.target.value
                                                    .replace(/\D/g, '')
                                                    .slice(0, 10),
                                            })
                                        }
                                        placeholder="Entrez votre numéro (10 chiffres)"
                                        className="relative h-20 rounded-[24px] border-2 border-white/30 bg-white/40 text-center font-mono text-2xl font-black text-slate-900 shadow-2xl shadow-purple-500/20 backdrop-blur-2xl transition-all placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                        autoFocus
                                        disabled={isVerifying}
                                    />
                                    {isVerifying && (
                                        <div className="absolute top-1/2 right-6 -translate-y-1/2">
                                            <Loader2 className="h-6 w-6 animate-spin text-brand-cyan" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {showLinkAccount && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="pt-6"
                                >
                                    <div className="space-y-6 rounded-[32px] border border-white/20 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
                                        <div className="text-center">
                                            <h3 className="text-xl font-black text-slate-800">
                                                Lier à un compte existant
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                Recherchez le client
                                                propriétaire de ce numéro
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Rechercher par nom..."
                                                value={searchQuery}
                                                onChange={(e) =>
                                                    setSearchQuery(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-12 rounded-xl bg-white"
                                            />
                                            <Button
                                                onClick={handleSearch}
                                                disabled={isSearching}
                                                className="h-12 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700"
                                            >
                                                {isSearching ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <div className="max-h-60 space-y-2 overflow-y-auto">
                                            {searchResults.map((client) => (
                                                <div
                                                    key={client.id}
                                                    onClick={() =>
                                                        handleLinkAccount(
                                                            client,
                                                        )
                                                    }
                                                    className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900">
                                                            {client.first_name}{' '}
                                                            {client.last_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {client.phone}
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 text-brand-cyan" />
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                setShowLinkAccount(false)
                                            }
                                            className="w-full text-slate-500 hover:text-red-500"
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {showRegistration && !showLinkAccount && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-6"
                                >
                                    <div className="flex items-center justify-between rounded-2xl border border-white/30 bg-white/10 px-6 py-4 shadow-xl backdrop-blur-xl">
                                        <span className="text-sm font-bold text-slate-600">
                                            Numéro à enregistrer
                                        </span>
                                        <span className="font-mono text-xl font-black text-brand-cyan">
                                            {formData.phone}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="ml-2 font-bold text-slate-800">
                                                Prénom
                                            </Label>
                                            <Input
                                                placeholder="Jean"
                                                value={formData.first_name}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        first_name:
                                                            e.target.value,
                                                    })
                                                }
                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="ml-2 font-bold text-slate-800">
                                                Nom
                                            </Label>
                                            <Input
                                                placeholder="Lozé"
                                                value={formData.last_name}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        last_name:
                                                            e.target.value,
                                                    })
                                                }
                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="ml-2 font-bold text-slate-800">
                                            Email (Optionnel)
                                        </Label>
                                        <Input
                                            placeholder="jean.loze@example.com"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    email: e.target.value,
                                                })
                                            }
                                            className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="ml-2 font-bold text-slate-800">
                                            Adresse (Optionnelle)
                                        </Label>
                                        <Input
                                            placeholder="Gombe, Kinshasa"
                                            value={formData.address}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    address: e.target.value,
                                                })
                                            }
                                            className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setShowRegistration(false);
                                            setFormData({
                                                ...formData,
                                                phone: '',
                                            });
                                        }}
                                        className="h-14 w-full rounded-2xl font-bold text-slate-500 transition-colors hover:bg-slate-100"
                                    >
                                        <ChevronLeft className="mr-2 h-5 w-5" />{' '}
                                        Retour
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowLinkAccount(true)}
                                        className="h-14 w-full rounded-2xl border-2 border-dashed border-brand-cyan/40 bg-brand-cyan/10 font-bold text-brand-cyan hover:bg-brand-cyan/20"
                                    >
                                        Déjà client ? Lier ce numéro
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-12"
                    >
                        <div className="space-y-2 text-center">
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-2 inline-block rounded-full bg-brand-blue/10 px-4 py-1 text-xs font-black tracking-widest text-brand-blue uppercase"
                            >
                                Étape 2 • Opération
                            </motion.span>
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">
                                Bonjour{' '}
                                <span className="text-brand-blue">
                                    {existingClient?.first_name ||
                                        formData.first_name}
                                </span>
                                ,
                                <p className="text-lg font-medium text-slate-600">
                                    Que souhaitez-vous faire aujourd'hui ?
                                </p>
                            </h2>
                        </div>

                        {existingClient && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="rounded-[24px] border border-slate-200 bg-slate-50/50 p-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                            <Phone className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black tracking-widest text-slate-500 uppercase">
                                                Numéro Actif
                                            </p>
                                            <p className="font-mono text-xl font-bold text-slate-900">
                                                {formData.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={() =>
                                            setShowPhoneSelector(
                                                !showPhoneSelector,
                                            )
                                        }
                                        className="font-bold text-slate-600 hover:text-slate-800"
                                    >
                                        <ChevronLeft
                                            className={
                                                showPhoneSelector
                                                    ? 'mr-2 h-4 w-4 -rotate-90 transition-transform'
                                                    : 'mr-2 h-4 w-4 transition-transform'
                                            }
                                        />
                                        Changer
                                    </Button>
                                </div>
                                <AnimatePresence>
                                    {showPhoneSelector && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{
                                                opacity: 1,
                                                height: 'auto',
                                            }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden bg-white/50 pt-4"
                                        >
                                            <MultiPhoneSelector
                                                phones={
                                                    existingClient.phones || []
                                                }
                                                selectedPhone={formData.phone}
                                                onSelect={(phone) => {
                                                    setFormData({
                                                        ...formData,
                                                        phone,
                                                    });
                                                    setShowPhoneSelector(false);
                                                }}
                                                onAdd={async (newPhone) => {
                                                    await addPhoneMutation.mutateAsync(
                                                        newPhone,
                                                    );
                                                }}
                                                isAdding={
                                                    addPhoneMutation.isPending
                                                }
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        <div className="grid gap-10">
                            <div className="space-y-6">
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-black text-slate-800">
                                        Opérations disponibles
                                    </h3>
                                </div>
                                <OperationSelector
                                    selectedOperation={formData.operation_type}
                                    onSelect={(op) =>
                                        setFormData({
                                            ...formData,
                                            operation_type: op,
                                            institution_id: undefined,
                                        })
                                    }
                                />
                            </div>

                            <AnimatePresence>
                                {formData.operation_type === 'change' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-6 overflow-hidden"
                                    >
                                        <div className="text-center md:text-left">
                                            <h3 className="text-2xl font-black text-slate-800">
                                                Bureau de Change
                                            </h3>
                                        </div>
                                        <ExchangeCalculator
                                            initialAmount={
                                                formData.amount_from > 0
                                                    ? formData.amount_from.toString()
                                                    : ''
                                            }
                                            onSelect={(data: any) => {
                                                setFormData({
                                                    ...formData,
                                                    currency_from:
                                                        data.currency_from,
                                                    currency_to:
                                                        data.currency_to,
                                                    exchange_rate:
                                                        data.exchange_rate,
                                                    amount_from:
                                                        data.amount_from,
                                                    amount: data.amount_to.toString(),
                                                });
                                            }}
                                        />
                                    </motion.div>
                                )}

                                {formData.operation_type &&
                                    formData.operation_type !== 'change' && (
                                        <motion.div
                                            key="service-selector-container"
                                            initial={{
                                                opacity: 0,
                                                height: 0,
                                                y: 20,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                height: 'auto',
                                                y: 0,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                height: 0,
                                                y: 20,
                                            }}
                                            className="space-y-4 overflow-hidden"
                                        >
                                            <Label className="ml-4 block text-sm font-black tracking-widest text-slate-400 uppercase">
                                                Partenaire Bancaire / Mobile
                                            </Label>
                                            <ServiceSelector
                                                institutions={institutions}
                                                selectedId={
                                                    formData.institution_id
                                                }
                                                onSelect={(id) =>
                                                    setFormData({
                                                        ...formData,
                                                        institution_id: id,
                                                    })
                                                }
                                                operationType={
                                                    formData.operation_type
                                                }
                                            />
                                        </motion.div>
                                    )}

                                {/* Operation Fields (Amount, Reason, Account Number, Custom Fields) */}
                                <AnimatePresence>
                                    {(formData.operation_type === 'depot' ||
                                        formData.operation_type ===
                                            'retrait') &&
                                        formData.institution_id && (
                                            <motion.div
                                                key="operation-fields-container"
                                                initial={{
                                                    opacity: 0,
                                                    height: 0,
                                                    y: 20,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    height: 'auto',
                                                    y: 0,
                                                }}
                                                exit={{
                                                    opacity: 0,
                                                    height: 0,
                                                    y: 20,
                                                }}
                                                className="space-y-4 pt-4"
                                            >
                                                {(() => {
                                                    const inst =
                                                        institutions.find(
                                                            (i) =>
                                                                i.id ===
                                                                formData.institution_id,
                                                        );
                                                    const settings = (
                                                        inst as any
                                                    )?.settings;
                                                    const required =
                                                        settings?.required_fields;

                                                    const isVisible = (
                                                        fieldId: string,
                                                    ) => {
                                                        // For withdrawals, hide most standard fields except amount
                                                        if (
                                                            formData.operation_type ===
                                                            'retrait'
                                                        )
                                                            return false;

                                                        // If settings defined, show only if in required_fields
                                                        if (required)
                                                            return required.includes(
                                                                fieldId,
                                                            );
                                                        // Fallback for banks
                                                        if (
                                                            inst?.type ===
                                                            'bank'
                                                        ) {
                                                            return [
                                                                'account_number',
                                                                'beneficiary',
                                                                'reason',
                                                            ].includes(fieldId);
                                                        }
                                                        // Fallback for mobile money
                                                        return [
                                                            'beneficiary_number',
                                                            'beneficiary',
                                                            'reason',
                                                        ].includes(fieldId);
                                                    };

                                                    return (
                                                        <div className="grid gap-6">
                                                            {isVisible(
                                                                'account_number',
                                                            ) && (
                                                                <div className="space-y-2">
                                                                    <Label className="ml-2 font-bold text-slate-800">
                                                                        Numéro
                                                                        de
                                                                        compte
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            formData.account_number
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setFormData(
                                                                                {
                                                                                    ...formData,
                                                                                    account_number:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="Compte bancaire..."
                                                                        className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                    />
                                                                </div>
                                                            )}

                                                            {isVisible(
                                                                'beneficiary_number',
                                                            ) && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="ml-2 font-bold text-slate-800">
                                                                            Numéro
                                                                            du
                                                                            bénéficiaire
                                                                        </Label>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setFormData(
                                                                                    {
                                                                                        ...formData,
                                                                                        beneficiary_number:
                                                                                            formData.phone,
                                                                                    },
                                                                                )
                                                                            }
                                                                            className="text-xs font-bold text-cyan-800 transition-colors hover:text-cyan-900"
                                                                        >
                                                                            Utiliser
                                                                            le
                                                                            mien
                                                                        </button>
                                                                    </div>
                                                                    <Input
                                                                        value={
                                                                            formData.beneficiary_number
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setFormData(
                                                                                {
                                                                                    ...formData,
                                                                                    beneficiary_number:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="08..."
                                                                        className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label className="ml-2 font-bold text-slate-800">
                                                                        Montant
                                                                    </Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            type="number"
                                                                            value={
                                                                                formData.amount
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setFormData(
                                                                                    {
                                                                                        ...formData,
                                                                                        amount: e
                                                                                            .target
                                                                                            .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                            placeholder="0.00"
                                                                            className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 pr-24 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                        />
                                                                        <div className="absolute top-1 right-1 bottom-1 flex rounded-xl bg-slate-100 p-1">
                                                                            {[
                                                                                'USD',
                                                                                'CDF',
                                                                            ].map(
                                                                                (
                                                                                    curr,
                                                                                ) => (
                                                                                    <button
                                                                                        key={
                                                                                            curr
                                                                                        }
                                                                                        onClick={() =>
                                                                                            setFormData(
                                                                                                {
                                                                                                    ...formData,
                                                                                                    currency:
                                                                                                        curr,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                        className={`relative z-10 w-12 rounded-lg text-sm font-black transition-all ${
                                                                                            formData.currency ===
                                                                                            curr
                                                                                                ? 'bg-white text-slate-900 shadow-sm'
                                                                                                : 'text-slate-400 hover:text-slate-600'
                                                                                        }`}
                                                                                    >
                                                                                        {
                                                                                            curr
                                                                                        }
                                                                                    </button>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {isVisible(
                                                                    'beneficiary',
                                                                ) && (
                                                                    <div className="space-y-2">
                                                                        <Label className="ml-2 font-bold text-slate-800">
                                                                            Bénéficiaire
                                                                        </Label>
                                                                        <Input
                                                                            value={
                                                                                formData.beneficiary
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setFormData(
                                                                                    {
                                                                                        ...formData,
                                                                                        beneficiary:
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                            placeholder="Nom du bénéficiaire"
                                                                            className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {formData.operation_type ===
                                                                'retrait' && (
                                                                <div className="rounded-[2.5rem] border-2 border-indigo-100/50 bg-white/40 p-10 shadow-[0_20px_50px_rgba(79,70,229,0.1)] backdrop-blur-2xl transition-all hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)]">
                                                                    <div className="mb-8 flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20">
                                                                                <Building2 className="h-7 w-7 text-white" />
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <h4 className="text-base font-black tracking-tight text-slate-900 uppercase">
                                                                                    Infos
                                                                                    de
                                                                                    l'Agent
                                                                                </h4>
                                                                                <p className="text-[10px] font-bold tracking-widest text-indigo-500 uppercase">
                                                                                    Transaction
                                                                                    Sécurisée
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-black tracking-widest text-slate-600 uppercase">
                                                                            {
                                                                                inst?.name
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid gap-6 md:grid-cols-2">
                                                                        <div className="group flex flex-col gap-2 text-left">
                                                                            <span className="ml-2 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                                                                Nom
                                                                                de
                                                                                l'Agent
                                                                            </span>
                                                                            <div className="flex h-16 items-center rounded-2xl border-2 border-slate-100 bg-white/80 px-6 text-lg font-black tracking-tight text-slate-900 shadow-sm transition-all group-hover:border-indigo-100 group-hover:bg-white">
                                                                                {settings?.withdrawal_agent_name ||
                                                                                    'NON CONFIGURÉ'}
                                                                            </div>
                                                                        </div>

                                                                        <div className="group flex flex-col gap-2 text-left">
                                                                            <div className="mb-0 flex items-center justify-between px-2">
                                                                                <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                                                                    Numéro
                                                                                    Agent
                                                                                </span>
                                                                                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black text-emerald-600 uppercase">
                                                                                    <ShieldCheck className="h-2.5 w-2.5" />
                                                                                    Vérifié
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex h-16 items-center justify-between rounded-2xl border-2 border-slate-100 bg-white/50 px-6 shadow-sm backdrop-blur-sm transition-all group-hover:border-indigo-100 group-hover:bg-white">
                                                                                <span className="text-xl font-black tracking-[0.2em] text-indigo-900">
                                                                                    {settings?.withdrawal_agent_number ||
                                                                                        '---'}
                                                                                </span>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-10 w-10 shrink-0 rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                                                                                    onClick={() => {
                                                                                        if (
                                                                                            settings?.withdrawal_agent_number
                                                                                        ) {
                                                                                            navigator.clipboard.writeText(
                                                                                                settings.withdrawal_agent_number,
                                                                                            );
                                                                                            toast.success(
                                                                                                'Copié !',
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Copy className="h-5 w-5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-8 flex items-start gap-4 rounded-3xl border border-indigo-100/30 bg-indigo-50/50 p-5 text-left">
                                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                                                                            <Info className="h-4 w-4 text-indigo-500" />
                                                                        </div>
                                                                        <p className="text-[11px] leading-relaxed font-semibold text-indigo-900/70">
                                                                            Veuillez
                                                                            effectuer
                                                                            votre
                                                                            retrait
                                                                            vers
                                                                            ce
                                                                            numéro
                                                                            d'agent.
                                                                            Une
                                                                            fois
                                                                            terminé,
                                                                            indiquez
                                                                            le
                                                                            montant
                                                                            ci-dessous
                                                                            pour
                                                                            validation
                                                                            par
                                                                            notre
                                                                            équipe.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {isVisible(
                                                                'reason',
                                                            ) && (
                                                                <div className="space-y-2">
                                                                    <Label className="ml-2 font-bold text-slate-800">
                                                                        Motif /
                                                                        Raison
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            formData.reason
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setFormData(
                                                                                {
                                                                                    ...formData,
                                                                                    reason: e
                                                                                        .target
                                                                                        .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="Raison du dépôt..."
                                                                        className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Custom Dynamic Fields (Deposits only) */}
                                                            {(() => {
                                                                if (
                                                                    formData.operation_type ===
                                                                    'retrait'
                                                                )
                                                                    return null;
                                                                const customFields =
                                                                    (
                                                                        (
                                                                            inst as any
                                                                        )
                                                                            ?.settings
                                                                            ?.custom_fields ||
                                                                        []
                                                                    ).filter(
                                                                        (
                                                                            f: any,
                                                                        ) =>
                                                                            !f.operation_type ||
                                                                            f.operation_type ===
                                                                                'both' ||
                                                                            f.operation_type ===
                                                                                'depot',
                                                                    );

                                                                return customFields.map(
                                                                    (
                                                                        field: any,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                field.id
                                                                            }
                                                                            className="space-y-2"
                                                                        >
                                                                            <Label className="ml-2 font-bold text-slate-800">
                                                                                {
                                                                                    field.label
                                                                                }
                                                                            </Label>
                                                                            <Input
                                                                                value={
                                                                                    formData
                                                                                        .metadata[
                                                                                        field
                                                                                            .id
                                                                                    ] ||
                                                                                    ''
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    setFormData(
                                                                                        {
                                                                                            ...formData,
                                                                                            metadata:
                                                                                                {
                                                                                                    ...formData.metadata,
                                                                                                    [field.id]:
                                                                                                        e
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        },
                                                                                    )
                                                                                }
                                                                                placeholder={`Entrez ${field.label.toLowerCase()}...`}
                                                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                            />
                                                                        </div>
                                                                    ),
                                                                );
                                                            })()}
                                                        </div>
                                                    );
                                                })()}
                                            </motion.div>
                                        )}
                                </AnimatePresence>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                );

            case 3:
                return (
                    <TicketSuccess
                        ticketNumber={ticketNumber}
                        onNewTicket={handleNewTicket}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <AppMain currentPageName="Client">
            <Head title="Client" />
            <div className="relative flex h-screen w-screen flex-col overflow-hidden">
                {/* Session Check Overlay */}
                <AnimatePresence>
                    {!isLoadingSession && !currentSession && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-3xl"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="relative w-full max-w-2xl overflow-hidden rounded-[3rem] bg-white p-12 text-center font-sans shadow-2xl"
                            >
                                <div className="absolute top-0 right-0 -z-10 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-50" />

                                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-slate-100 bg-slate-50">
                                    <LockIcon className="h-12 w-12 text-slate-300" />
                                </div>

                                <h1 className="mb-4 text-4xl font-black tracking-tighter text-slate-900 uppercase">
                                    Agence{' '}
                                    <span className="text-indigo-600">
                                        Fermée
                                    </span>
                                </h1>

                                <p className="mb-10 text-lg leading-relaxed font-medium text-slate-500">
                                    Veuillez patienter... Le manager n'a pas
                                    encore ouvert la session de travail pour
                                    cette agence.
                                </p>

                                <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
                                    <div className="flex flex-col items-center rounded-3xl border border-slate-100 bg-slate-50 p-6">
                                        <ClockIcon className="mb-2 h-6 w-6 text-indigo-500" />
                                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                            Heure Locale
                                        </span>
                                        <span className="text-lg font-black text-slate-800">
                                            {moment().format('HH:mm')}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center rounded-3xl border border-slate-100 bg-slate-50 p-6">
                                        <StoreIcon className="mb-2 h-6 w-6 text-indigo-500" />
                                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                            Agence
                                        </span>
                                        <span className="text-lg font-black text-slate-800">
                                            Kinshasa
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-12 flex justify-center">
                                    <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-6 py-3">
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
                                        <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">
                                            Actualisation automatique
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Premium Background */}
                <div className="fixed inset-0 z-0">
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: 'url(/images/background1.png)',
                        }}
                    />
                    {/* Dark overlay for better readability */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-900/20 to-slate-900/40" />
                </div>

                <div className="relative z-10 flex w-full flex-1 flex-col overflow-hidden px-4 pb-4">
                    {/* Compact Header */}
                    <div className="flex shrink-0 items-center justify-between py-4">
                        <div className="flex items-center gap-4 rounded-full bg-white/10 px-6 py-2 backdrop-blur-md">
                            <img
                                src="/logo.png"
                                alt="Havifin"
                                className="h-10 w-10 object-contain"
                            />
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                                    Havifin
                                </h1>
                                <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">
                                    Smart Ticket
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Form Container */}
                    <div className="scrollbar-hide flex-1 overflow-y-auto">
                        <div className="mx-auto max-w-5xl">
                            <div className="rounded-[40px] border border-white/20 bg-white/60 p-8 shadow-2xl shadow-purple-500/20 backdrop-blur-2xl md:p-12">
                                <AnimatePresence mode="wait">
                                    {renderStep()}
                                </AnimatePresence>

                                {step < 3 && (
                                    <div className="mt-12 flex justify-center gap-4">
                                        {step === 2 && (
                                            <Button
                                                variant="ghost"
                                                onClick={handleNewTicket}
                                                size="lg"
                                                className="h-16 rounded-3xl border border-white/30 bg-white/20 px-16 text-xl font-bold text-slate-600 shadow-xl backdrop-blur-xl transition-all hover:bg-white/40 hover:text-red-500"
                                            >
                                                Annuler
                                            </Button>
                                        )}
                                        <Button
                                            onClick={handleNext}
                                            disabled={
                                                !canProceed() ||
                                                createClientMutation.isPending ||
                                                registerMutation.isPending ||
                                                isVerifying
                                            }
                                            size="lg"
                                            className="h-16 rounded-3xl border border-white/30 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 px-16 text-xl font-bold text-white shadow-2xl shadow-cyan-500/30 backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-white/50 hover:shadow-cyan-500/50 active:scale-[0.98]"
                                        >
                                            {createClientMutation.isPending ||
                                            registerMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                                    Traitement...
                                                </>
                                            ) : (
                                                <>
                                                    {step === 1 && 'Continuer'}
                                                    {step === 2 && 'Confirmer'}
                                                    <ArrowRight className="ml-3 h-6 w-6" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Footsteps */}
                            {step < 3 && (
                                <div className="mt-12 flex justify-center gap-4">
                                    {[1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-2 rounded-full transition-all duration-500 ${step === i ? 'w-12 bg-blue-600' : 'w-2 bg-slate-200'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppMain>
    );
}
