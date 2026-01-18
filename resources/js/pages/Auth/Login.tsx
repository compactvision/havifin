import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    setErrors(data.errors);
                } else if (data.message) {
                    toast.error(data.message);
                }
                return;
            }

            toast.success('Connexion réussie!');
            
            // Redirect based on role
            if (data.role === 'manager') {
                window.location.href = '/manager';
            } else if (data.role === 'cashier') {
                window.location.href = '/cashier';
            } else if (data.role === 'client') {
                window.location.href = '/clientform';
            } else {
                window.location.href = '/clientform';
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Une erreur est survenue lors de la connexion');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="fixed inset-0 z-0">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/images/background1.png)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-900/20 to-slate-900/40" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="mb-12 text-center">
                        <div className="group relative mx-auto mb-8 inline-block">
                            <div className="absolute -inset-12 rounded-full bg-gradient-to-tr from-cyan-400/30 via-purple-500/30 to-pink-500/30 opacity-60 blur-3xl transition-all duration-700 group-hover:opacity-100 group-hover:scale-110" />
                            <div className="relative flex h-32 w-32 items-center justify-center rounded-[40px] border border-white/30 bg-white/10 p-6 shadow-2xl shadow-purple-500/20 backdrop-blur-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-white/50 group-hover:bg-white/20">
                                <img
                                    src="/logo.png"
                                    alt="Havifin"
                                    className="h-full w-full object-contain drop-shadow-2xl"
                                />
                            </div>
                        </div>
                        <h1 className="mb-2 text-4xl font-black tracking-tight drop-shadow-lg">
                            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
                                Havifin
                            </span>
                        </h1>
                        <p className="text-lg font-bold tracking-widest text-white/60 uppercase">
                            Connexion
                        </p>
                    </div>

                    <div className="rounded-[32px] border border-white/20 bg-white/10 p-8 shadow-2xl shadow-purple-500/20 backdrop-blur-2xl">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="ml-2 font-bold text-white">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/40" />
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="admin@havifin.com"
                                        className="h-14 rounded-2xl border-2 border-white/30 bg-white/10 pl-12 text-white shadow-xl backdrop-blur-xl placeholder:text-white/40 focus:border-white/60 focus:bg-white/20 focus:ring-4 focus:ring-cyan-400/30"
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                        <AlertCircle className="h-4 w-4" />
                                        {errors.email}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="ml-2 font-bold text-white">
                                    Mot de passe
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/40" />
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        placeholder="••••••••"
                                        className="h-14 rounded-2xl border-2 border-white/30 bg-white/10 pl-12 text-white shadow-xl backdrop-blur-xl placeholder:text-white/40 focus:border-white/60 focus:bg-white/20 focus:ring-4 focus:ring-cyan-400/30"
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.password && (
                                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                        <AlertCircle className="h-4 w-4" />
                                        {errors.password}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={formData.remember}
                                    onChange={(e) =>
                                        setFormData({ ...formData, remember: e.target.checked })
                                    }
                                    className="h-5 w-5 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-2 focus:ring-cyan-400/30"
                                />
                                <label htmlFor="remember" className="text-sm font-medium text-white/70">
                                    Se souvenir de moi
                                </label>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="h-14 w-full rounded-2xl border border-white/30 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-lg font-bold text-white shadow-2xl shadow-cyan-500/30 backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-white/50 hover:shadow-cyan-500/50 active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Connexion en cours...
                                    </>
                                ) : (
                                    <>
                                        Se connecter
                                        <LogIn className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center text-sm text-cyan-200">
                            <p className="font-medium">Comptes de test</p>
                            <p className="mt-1 text-xs text-cyan-300/70">
                                Manager: admin@havifin.com / password
                            </p>
                            <p className="text-xs text-cyan-300/70">
                                Cashier: cashier@havifin.com / password
                            </p>
                            <p className="text-xs text-cyan-300/70">
                                Client: client@havifin.com / password
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
