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
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
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
        role: 'manager' as 'manager' | 'cashier',
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => base44.entities.User.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            if (shopId) {
                queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
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
                <div className="border-b border-slate-100 bg-slate-50/50 p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                            {formData.role === 'manager'
                                ? 'Nouveau Manager'
                                : 'Nouveau Caissier'}
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
                                className="h-12 rounded-xl border-slate-200 font-bold focus:border-indigo-500"
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
                                className="h-12 rounded-xl border-slate-200 font-bold focus:border-indigo-500"
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
                                    className="h-12 rounded-xl border-slate-200 pr-12 font-bold focus:border-indigo-500"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        role: 'manager',
                                    })
                                }
                                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                                    formData.role === 'manager'
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                <Shield
                                    className={`h-6 w-6 ${formData.role === 'manager' ? 'text-indigo-600' : 'text-slate-300'}`}
                                />
                                <span className="text-[10px] font-black uppercase">
                                    Manager
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({
                                        ...formData,
                                        role: 'cashier',
                                    })
                                }
                                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                                    formData.role === 'cashier'
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                <UserPlus
                                    className={`h-6 w-6 ${formData.role === 'cashier' ? 'text-indigo-600' : 'text-slate-300'}`}
                                />
                                <span className="text-[10px] font-black uppercase">
                                    Caissier
                                </span>
                            </button>
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
                                'Créer le compte'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Shield({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
    );
}
