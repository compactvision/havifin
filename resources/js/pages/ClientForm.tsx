import { base44, Client, ClientPhone } from '@/api/base44Client';
import MultiPhoneSelector from '@/components/client/MultiPhoneSelector';
import OperationSelector from '@/components/client/OperationSelector';
import ServiceSelector from '@/components/client/ServiceSelector';
import TicketSuccess from '@/components/client/TicketSuccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppMain from '@/layouts/app-main';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, Loader2, Phone, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const generateTicketNumber = () => {
    const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `${prefix}${number}`;
};

export default function ClientForm() {
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

    // Fetch active institutions only
    const { data: institutions = [], isPending: isLoadingInstitutions } =
        useQuery({
            queryKey: ['institutions', 'active'],
            queryFn: () => base44.entities.Institution.active(),
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
            const ticket = generateTicketNumber();
            const clientData = {
                ...data,
                phone: formData.phone,
                ticket_number: ticket,
                status: 'waiting',
                first_name:
                    existingClient?.first_name || data.first_name || 'Client',
                last_name:
                    existingClient?.last_name || data.last_name || 'Anonyme',
                is_registered: !!existingClient && !isAnonymous,
            };
            await base44.entities.Client.create(clientData);
            return ticket;
        },
        onSuccess: (ticket) => {
            setTicketNumber(ticket);
            setStep(3);
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
            if (
                formData.operation_type === 'change' ||
                formData.operation_type === 'paiement'
            )
                return true;

            const hasBasicFields = !!(
                formData.operation_type && formData.institution_id
            );
            if (!hasBasicFields) return false;

            if (formData.operation_type === 'depot') {
                const inst = institutions.find(
                    (i) => i.id === formData.institution_id,
                );
                // Motif is now optional
                const hasAmount = !!formData.amount;

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
                            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/20 bg-gradient-to-br from-cyan-400/20 to-purple-500/20 shadow-xl shadow-purple-500/20 backdrop-blur-xl transition-transform group-hover:scale-110">
                                <Phone className="h-12 w-12 text-slate-800 transition-transform group-hover:rotate-12" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tight text-slate-800 drop-shadow-sm">
                                {showRegistration
                                    ? 'Nouvelle Inscription'
                                    : 'Bienvenue chez Havifin'}
                            </h2>
                            <p className="mt-3 text-lg font-medium text-slate-600">
                                {showRegistration
                                    ? 'Laissez-nous faire connaissance pour mieux vous servir'
                                    : 'Identifiez-vous pour commencer votre opération'}
                            </p>
                        </div>

                        <div className="mx-auto max-w-lg space-y-6">
                            {!existingClient && !showRegistration && (
                                <div className="group relative">
                                    <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-400/40 via-purple-500/40 to-pink-500/40 opacity-60 blur-xl transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
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
                                            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
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
                                                    <ArrowRight className="h-4 w-4 text-cyan-600" />
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
                                        <span className="font-mono text-xl font-black text-cyan-600">
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
                                        className="h-14 w-full rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50 font-bold text-cyan-700 hover:bg-cyan-100"
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
                                className="mb-2 inline-block rounded-full bg-blue-50 px-4 py-1 text-xs font-black tracking-widest text-blue-600 uppercase"
                            >
                                Étape 2 • Opération
                            </motion.span>
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">
                                Bonjour{' '}
                                <span className="text-blue-600">
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
                                {formData.operation_type &&
                                    formData.operation_type !== 'change' && (
                                        <motion.div
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
                                            />
                                        </motion.div>
                                    )}

                                {/* Depot Fields (Amount, Reason, Account Number) */}
                                <AnimatePresence>
                                    {formData.operation_type === 'depot' &&
                                        formData.institution_id && (
                                            <motion.div
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
                                                {institutions.find(
                                                    (i) =>
                                                        i.id ===
                                                        formData.institution_id,
                                                )?.type === 'bank' ? (
                                                    // Layout Banque
                                                    <>
                                                        <div className="space-y-2">
                                                            <Label className="ml-2 font-bold text-slate-800">
                                                                Numéro de compte
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    formData.account_number
                                                                }
                                                                onChange={(e) =>
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
                                                                placeholder="Entrez le numéro de compte"
                                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                            />
                                                        </div>

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

                                                            <div className="space-y-2">
                                                                <Label className="ml-2 font-bold text-slate-800">
                                                                    Nom du
                                                                    bénéficiaire
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
                                                                    placeholder="Nom complet du bénéficiaire"
                                                                    className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="ml-2 font-bold text-slate-800">
                                                                Motif
                                                                (Optionnel)
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    formData.reason
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData(
                                                                        {
                                                                            ...formData,
                                                                            reason: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Raison du dépôt"
                                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    // Layout Mobile (Grid 2 cols)
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="ml-2 font-bold text-slate-800">
                                                                    Numéro du
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
                                                                    Utiliser mon
                                                                    numéro
                                                                </button>
                                                            </div>
                                                            <Input
                                                                value={
                                                                    formData.beneficiary_number
                                                                }
                                                                onChange={(e) =>
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
                                                                placeholder="Saisissez le numéro"
                                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                            />
                                                        </div>

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

                                                        <div className="space-y-2">
                                                            <Label className="ml-2 font-bold text-slate-800">
                                                                Nom du
                                                                bénéficiaire
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    formData.beneficiary
                                                                }
                                                                onChange={(e) =>
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
                                                                placeholder="Nom complet du bénéficiaire"
                                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="ml-2 font-bold text-slate-800">
                                                                Motif
                                                                (Optionnel)
                                                            </Label>
                                                            <Input
                                                                value={
                                                                    formData.reason
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData(
                                                                        {
                                                                            ...formData,
                                                                            reason: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Raison du dépôt"
                                                                className="h-14 rounded-2xl border-2 border-white/30 bg-white/40 text-slate-900 shadow-xl backdrop-blur-xl placeholder:text-slate-400 focus:border-white/60 focus:bg-white/60 focus:ring-4 focus:ring-cyan-400/30"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
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
            <div className="relative min-h-screen overflow-hidden">
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

                <div className="relative z-10 mx-auto max-w-5xl px-4 py-12">
                    <div className="mb-12 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center"
                        >
                            <div className="group relative mb-12">
                                <div className="absolute -inset-12 rounded-full bg-gradient-to-tr from-cyan-400/30 via-purple-500/30 to-pink-500/30 opacity-60 blur-3xl transition-all duration-700 group-hover:scale-110 group-hover:opacity-100" />
                                <div className="relative flex h-40 w-40 items-center justify-center rounded-[48px] border border-white/30 bg-white/10 p-8 shadow-2xl shadow-purple-500/20 backdrop-blur-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-white/50 group-hover:bg-white/20">
                                    <img
                                        src="/logo.png"
                                        alt="Havifin"
                                        className="h-full w-full object-contain drop-shadow-2xl"
                                    />
                                    <div className="absolute inset-0 rounded-[48px] bg-gradient-to-tr from-cyan-400/10 via-purple-500/10 to-pink-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                            </div>
                            <h1 className="mb-2 text-5xl font-black tracking-tight drop-shadow-lg">
                                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
                                    Havifin
                                </span>
                                <span className="mx-2 text-white/40">|</span>
                                <span className="text-white/90">
                                    Smart Ticket
                                </span>
                            </h1>
                            <p className="text-lg font-bold tracking-widest text-white/60 uppercase">
                                Bureau de Change & Services
                            </p>
                        </motion.div>
                    </div>

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
        </AppMain>
    );
}
