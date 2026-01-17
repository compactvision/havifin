import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Send } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientPhone?: string;
}

export default function HelpModal({
    isOpen,
    onClose,
    clientPhone,
}: HelpModalProps) {
    const [description, setDescription] = React.useState('');

    const mutation = useMutation({
        mutationFn: async (data: {
            client_phone: string;
            description: string;
        }) => {
            return base44.entities.HelpRequest.create(data);
        },
        onSuccess: () => {
            toast.success("Demande d'aide envoyée au manager");
            setDescription('');
            onClose();
        },
        onError: () => {
            toast.error("Erreur lors de l'envoi de la demande");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        mutation.mutate({
            client_phone: clientPhone || 'N/A',
            description: description,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="overflow-hidden rounded-[32px] border-none bg-slate-900 p-0 text-white sm:max-w-[500px]">
                <div className="relative p-8">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 bg-amber-500/10 blur-3xl" />

                    <DialogHeader className="mb-6">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20">
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                        </div>
                        <DialogTitle className="text-3xl font-black tracking-tight">
                            Besoin d'aide ?
                        </DialogTitle>
                        <DialogDescription className="text-lg font-medium text-slate-400">
                            Expliquez brièvement le problème au manager.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="ml-1 text-xs font-black tracking-widest text-slate-500 uppercase">
                                Message d'urgence
                            </label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ex: Problème de validation M-Pesa, client impatient..."
                                className="min-h-[120px] resize-none rounded-2xl border-white/10 bg-white/5 p-4 text-lg text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500"
                            />
                        </div>

                        {clientPhone && (
                            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                                <AlertCircle className="h-5 w-5 text-slate-400" />
                                <div>
                                    <div className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
                                        Client associé
                                    </div>
                                    <div className="text-sm font-bold">
                                        {clientPhone}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="h-14 flex-1 rounded-2xl border border-white/5 font-bold text-slate-400 hover:bg-white/5"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    mutation.isPending || !description.trim()
                                }
                                className="h-14 flex-[2] rounded-2xl bg-amber-500 text-lg font-black text-black shadow-lg shadow-amber-500/20 hover:bg-amber-600"
                            >
                                {mutation.isPending ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1,
                                            ease: 'linear',
                                        }}
                                    >
                                        <RefreshCw className="h-6 w-6" />
                                    </motion.div>
                                ) : (
                                    <>
                                        Envoyer Alerte
                                        <Send className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
