import { base44 } from '@/api/base44Client';
import OperationSelector from '@/components/client/OperationSelector';
import ServiceSelector from '@/components/client/ServiceSelector';
import TicketSuccess from '@/components/client/TicketSuccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppMain from '@/layouts/app-main';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, Phone } from 'lucide-react';
import React, { useState } from 'react';

const generateTicketNumber = () => {
    const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `${prefix}${number}`;
};

export default function ClientForm() {
    const [step, setStep] = useState(1);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        phone: '',
        operation_type: '',
        service: '',
    });

    const createClientMutation = useMutation({
        mutationFn: async (data) => {
            const ticket = generateTicketNumber();
            const clientData = {
                ...data,
                ticket_number: ticket,
                status: 'waiting',
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
        if (step === 1 && formData.phone) {
            setStep(2);
        } else if (step === 2) {
            if (formData.operation_type === 'change') {
                // For change, we skip service selection and submit directly
                createClientMutation.mutate({
                    ...formData,
                    service: 'bureau', // Default service for change
                });
            } else if (formData.operation_type && formData.service) {
                createClientMutation.mutate(formData);
            }
        }
    };

    const handleNewTicket = () => {
        setStep(1);
        setTicketNumber(null);
        setFormData({
            phone: '',
            operation_type: '',
            service: '',
        });
    };

    const canProceed = () => {
        if (step === 1) return formData.phone && formData.phone.length >= 9;
        if (step === 2) {
            if (formData.operation_type === 'change') return true;
            return formData.operation_type && formData.service;
        }
        return true;
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 text-center"
                    >
                        <div className="mb-8">
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1f61e4] to-[#2000ff] shadow-2xl shadow-[#1f61e4]/30">
                                <Phone className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800">
                                Bienvenue
                            </h2>
                            <p className="mt-2 text-lg text-slate-500">
                                Entrez votre numéro de téléphone
                            </p>
                        </div>

                        <div className="mx-auto max-w-sm">
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        phone: e.target.value,
                                    })
                                }
                                placeholder="+243 XXX XXX XXX"
                                className="h-16 rounded-2xl border-2 border-slate-100 text-center text-xl shadow-lg shadow-slate-100/50 focus:border-[#1f61e4] focus:ring-[#1f61e4]"
                                autoFocus
                            />
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-slate-800">
                                Que souhaitez-vous faire?
                            </h2>
                            <p className="mt-1 text-slate-500">
                                Choisissez votre opération
                            </p>
                        </div>

                        <div>
                            <Label className="mb-3 block text-base font-semibold text-slate-700">
                                Opération
                            </Label>
                            <OperationSelector
                                selectedOperation={formData.operation_type}
                                onSelect={(op) =>
                                    setFormData({
                                        ...formData,
                                        operation_type: op,
                                        service:
                                            op === 'change' ? 'bureau' : '', // Reset service if not change
                                    })
                                }
                            />
                        </div>

                        {formData.operation_type &&
                            formData.operation_type !== 'change' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Label className="mb-3 block text-base font-semibold text-slate-700">
                                        Service de paiement
                                    </Label>
                                    <ServiceSelector
                                        selectedService={formData.service}
                                        onSelect={(service) =>
                                            setFormData({
                                                ...formData,
                                                service,
                                            })
                                        }
                                    />
                                </motion.div>
                            )}

                        {/* Instant confirmation for Change */}
                        {formData.operation_type === 'change' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-medium text-amber-800"
                            >
                                Opération de change au guichet. Cliquez sur
                                Confirmer pour obtenir votre ticket.
                            </motion.div>
                        )}
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#00e2f6]/10">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    {/* Header */}
                    <div className="mb-12 text-center">
                        <h1 className="mb-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                            Bureau de{' '}
                            <span className="text-[#1f61e4]">Change</span>
                        </h1>
                        <p className="text-slate-500">
                            Service rapide et fiable
                        </p>
                    </div>

                    {/* Progress Indicator */}
                    {step < 3 && (
                        <div className="mb-8 flex justify-center">
                            <div className="flex items-center gap-3">
                                {[1, 2].map((s) => (
                                    <React.Fragment key={s}>
                                        <div
                                            className={`flex h-12 w-12 items-center justify-center rounded-full font-bold transition-all ${
                                                s === step
                                                    ? 'scale-110 bg-[#1f61e4] text-white shadow-lg shadow-[#1f61e4]/30'
                                                    : s < step
                                                      ? 'bg-[#00e2f6] text-white'
                                                      : 'bg-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {s}
                                        </div>
                                        {s < 2 && (
                                            <div
                                                className={`h-1 w-12 rounded-full transition-all ${s < step ? 'bg-[#00e2f6]' : 'bg-slate-200'}`}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form Content */}
                    <div className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/50 md:p-12">
                        <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00e2f6]/5" />
                        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#bf15cf]/5" />

                        <div className="relative z-10">
                            <AnimatePresence mode="wait">
                                {renderStep()}
                            </AnimatePresence>

                            {/* Navigation */}
                            {step < 3 && (
                                <div className="mt-12 flex justify-center">
                                    <Button
                                        onClick={handleNext}
                                        disabled={
                                            !canProceed() ||
                                            createClientMutation.isPending
                                        }
                                        size="lg"
                                        className="h-14 rounded-full bg-gradient-to-r from-[#1f61e4] to-[#2000ff] px-12 text-lg text-white shadow-xl shadow-[#1f61e4]/30 hover:from-[#2000ff] hover:to-[#1f61e4] disabled:opacity-50"
                                    >
                                        {createClientMutation.isPending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                {step === 2
                                                    ? 'Confirmer'
                                                    : 'Suivant'}
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppMain>
    );
}
