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
import { ArrowRight, ChevronLeft, Loader2, Phone } from 'lucide-react';
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
                first_name: existingClient?.first_name || data.first_name,
                last_name: existingClient?.last_name || data.last_name,
                is_registered: !!existingClient,
            };
            await base44.entities.Client.create(clientData);
            return ticket;
        },
        onSuccess: (ticket) => {
            setTicketNumber(ticket);
            setStep(3);
        },
    });

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
                    service: inst?.name || '',
                });
            }
        }
    };

    const handleNewTicket = () => {
        setStep(1);
        setTicketNumber(null);
        setExistingClient(null);
        setShowRegistration(false);
        setFormData({
            phone: '',
            operation_type: '',
            institution_id: undefined,
            first_name: '',
            last_name: '',
            email: '',
            address: '',
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
            if (formData.operation_type === 'change') return true;
            return !!(formData.operation_type && formData.institution_id);
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
                            <div className="group mx-auto mb-6 flex h-24 w-24 animate-in items-center justify-center rounded-[32px] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/20 duration-500 fade-in zoom-in">
                                <Phone className="h-12 w-12 text-white transition-transform group-hover:rotate-12" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">
                                {showRegistration
                                    ? 'Nouvelle Inscription'
                                    : 'Bienvenue chez Havifin'}
                            </h2>
                            <p className="mt-3 text-lg font-medium text-slate-400">
                                {showRegistration
                                    ? 'Laissez-nous faire connaissance pour mieux vous servir'
                                    : 'Identifiez-vous pour commencer votre opération'}
                            </p>
                        </div>

                        <div className="mx-auto max-w-lg space-y-6">
                            {!existingClient && !showRegistration && (
                                <div className="group relative">
                                    <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-blue-500 to-indigo-600 opacity-25 blur transition duration-1000 group-hover:opacity-40 group-hover:duration-200"></div>
                                    <Input
                                        type="tel"
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
                                        className="relative h-20 rounded-[24px] border-2 border-slate-100 bg-white text-center font-mono text-2xl font-black shadow-lg transition-all focus:border-blue-500 focus:ring-blue-500"
                                        autoFocus
                                        disabled={isVerifying}
                                    />
                                    {isVerifying && (
                                        <div className="absolute top-1/2 right-6 -translate-y-1/2">
                                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {existingClient && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <Label className="text-lg font-black text-slate-800">
                                            Vos numéros
                                        </Label>
                                        <button
                                            onClick={() => {
                                                setExistingClient(null);
                                                setFormData({
                                                    ...formData,
                                                    phone: '',
                                                });
                                            }}
                                            className="flex items-center gap-1 text-sm font-bold text-blue-500 hover:text-blue-700"
                                        >
                                            <ChevronLeft className="h-4 w-4" />{' '}
                                            Changer
                                        </button>
                                    </div>

                                    <MultiPhoneSelector
                                        phones={existingClient.phones || []}
                                        selectedPhone={formData.phone}
                                        onSelect={(phone) =>
                                            setFormData({ ...formData, phone })
                                        }
                                        onAdd={async (newPhone) => {
                                            await addPhoneMutation.mutateAsync(
                                                newPhone,
                                            );
                                        }}
                                        isAdding={addPhoneMutation.isPending}
                                    />

                                    <div className="group relative mt-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">
                                        <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                                        <div className="relative z-10 text-center">
                                            <p className="mb-1 text-4xl font-black">
                                                Bonjour{' '}
                                                {existingClient.first_name} !
                                            </p>
                                            <p className="font-medium text-blue-100">
                                                On continue avec ce numéro de
                                                téléphone ?
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {showRegistration && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-6"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="ml-2 font-bold text-slate-600">
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
                                                className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="ml-2 font-bold text-slate-600">
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
                                                className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="ml-2 font-bold text-slate-600">
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
                                            className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="ml-2 font-bold text-slate-600">
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
                                            className="h-14 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-blue-50"
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
                            </h2>
                            <p className="text-xl font-medium text-slate-500">
                                Quelle opération souhaitez-vous effectuer
                                aujourd'hui ?
                            </p>
                        </div>

                        <div className="grid gap-10">
                            <div className="space-y-4">
                                <Label className="ml-4 block text-sm font-black tracking-widest text-slate-400 uppercase">
                                    Type d'Opération
                                </Label>
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
            <div className="relative min-h-screen overflow-hidden bg-slate-50">
                {/* Background animations */}
                <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-100 opacity-50 blur-[100px]" />
                    <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-purple-100 opacity-50 blur-[100px] delay-1000" />
                </div>

                <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
                    <div className="mb-12 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h1 className="mb-2 text-5xl font-black tracking-tight text-slate-900">
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Havifin
                                </span>
                                <span className="mx-2 text-slate-200">|</span>
                                <span className="text-slate-600">
                                    Smart Ticket
                                </span>
                            </h1>
                            <p className="text-lg font-bold tracking-widest text-slate-400 uppercase">
                                Bureau de Change & Services
                            </p>
                        </motion.div>
                    </div>

                    <div className="rounded-[40px] border border-white/20 bg-white/80 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl md:p-12">
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>

                        {step < 3 && (
                            <div className="mt-12 flex justify-center">
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        !canProceed() ||
                                        createClientMutation.isPending ||
                                        registerMutation.isPending ||
                                        isVerifying
                                    }
                                    size="lg"
                                    className="h-16 rounded-3xl bg-gradient-to-r from-[#1f61e4] to-[#2000ff] px-16 text-xl font-bold text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {createClientMutation.isPending ||
                                    registerMutation.isPending ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <>
                                            {step === 1 && showRegistration
                                                ? "S'enregistrer"
                                                : step === 2
                                                  ? 'Confirmer'
                                                  : 'Continuer'}
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
