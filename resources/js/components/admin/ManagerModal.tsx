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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ManagerModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    shopId?: number;
}

export default function ManagerModal({
    isOpen,
    onOpenChange,
    shopId,
}: ManagerModalProps) {
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'manager' as const,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => base44.entities.User.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            if (shopId) {
                queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
                queryClient.invalidateQueries({
                    queryKey: ['shop-statistics', shopId],
                });
            }
            toast.success('Compte créé avec succès');
            onOpenChange(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error(
                error.response?.data?.message || 'Erreur lors de la création',
            );
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'manager',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            shop_ids: shopId ? [shopId] : [],
        };
        createMutation.mutate(payload);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md overflow-hidden rounded-[2.5rem] border-slate-100 p-0">
                <div className="border-b border-brand-blue/10 bg-gradient-to-r from-brand-blue/[0.06] to-brand-pink/[0.05] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                            Nommer un Manager
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 p-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label
                                htmlFor="name"
                                className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase"
                            >
                                Nom Complet
                            </Label>
                            <Input
                                id="name"
                                placeholder="ex: Jean Dupont"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                className="h-12 font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase"
                            >
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="jean.dupont@example.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        email: e.target.value,
                                    })
                                }
                                className="h-12 font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase"
                            >
                                Mot de Passe
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    className="h-12 pr-12 font-bold"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-brand-blue"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-brand-blue/10 bg-brand-blue/[0.05] p-4">
                            <p className="text-xs font-bold text-brand-blue">
                                Ce compte aura uniquement le rôle Manager et
                                pourra être affecté à la boutique sélectionnée.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-12 rounded-xl border-slate-200 px-8 text-xs font-black tracking-widest uppercase hover:bg-slate-50"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            className="h-12 rounded-xl bg-slate-900 px-8 text-xs font-black tracking-widest text-white uppercase shadow-xl transition-all hover:bg-black"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Nommer le manager'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
