import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from '@/lib/axios';
import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    Lock,
    Mail,
    ShieldCheck,
    Sparkles,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface LoginProps {
    twoFactorChallenge?: boolean;
}

export default function Login({ twoFactorChallenge = false }: LoginProps) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [requiresTwoFactor, setRequiresTwoFactor] =
        useState(twoFactorChallenge);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>(
        {},
    );

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            if (requiresTwoFactor) {
                await axios.post('/two-factor-challenge', {
                    code: twoFactorCode,
                });
            } else {
                const loginResponse = await axios.post('/login', formData);
                if (loginResponse.data?.two_factor) {
                    setRequiresTwoFactor(true);
                    return;
                }
            }

            const { data } = await axios.get('/api/auth/me');

            toast.success('Connexion réussie !');
            await new Promise((resolve) => setTimeout(resolve, 300));

            if (data.role === 'super-admin') {
                window.location.href = '/admin/shops';
            } else if (data.role === 'manager') {
                window.location.href = '/manager';
            } else if (data.role === 'cashier') {
                window.location.href = '/cashier/today';
            } else {
                window.location.href = '/clientform';
            }
        } catch (error: any) {
            console.error('Login error:', error);

            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Une erreur est survenue lors de la connexion');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="brand-canvas min-h-screen">
            <Head title="Connexion" />

            <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
                <aside className="brand-hero relative hidden min-h-screen flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20">
                            <img
                                src="/logo-color.png"
                                alt="Havifin"
                                className="brand-logo-crop h-full w-full object-contain"
                            />
                        </div>
                        <div>
                            <p className="text-2xl font-black tracking-tight">
                                havifin
                            </p>
                            <p className="text-xs font-bold tracking-[0.24em] text-cyan-200 uppercase">
                                Finance en mouvement
                            </p>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                        className="relative z-10 max-w-2xl"
                    >
                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black tracking-[0.18em] uppercase backdrop-blur-xl">
                            <Sparkles className="h-4 w-4 text-brand-cyan" />
                            Votre argent entre de bonnes mains
                        </div>
                        <h1 className="brand-title text-5xl leading-[0.98] text-white xl:text-7xl">
                            Pilotez chaque opération avec
                            <span className="block text-brand-cyan">
                                vitesse et clarté.
                            </span>
                        </h1>
                        <p className="mt-7 max-w-xl text-base leading-7 font-medium text-white/72 xl:text-lg">
                            Une expérience financière fluide, précise et
                            sécurisée, pensée pour connecter vos boutiques, vos
                            équipes et vos clients.
                        </p>

                        <div className="mt-9 flex flex-wrap gap-3">
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
                                <Zap className="mb-2 h-5 w-5 text-brand-pink" />
                                <p className="text-sm font-black">Instantané</p>
                                <p className="text-xs text-white/55">
                                    Données en temps réel
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
                                <ShieldCheck className="mb-2 h-5 w-5 text-brand-cyan" />
                                <p className="text-sm font-black">Sécurisé</p>
                                <p className="text-xs text-white/55">
                                    Accès par rôle
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="relative z-10 flex items-center gap-4 text-xs font-bold tracking-[0.18em] text-white/50 uppercase">
                        <span className="h-px w-12 bg-gradient-to-r from-brand-cyan to-brand-pink" />
                        Rapide · Fiable · Fluide
                    </div>

                    <div className="brand-orbit absolute -right-24 bottom-24 z-0 h-72 w-72" />
                    <div className="brand-orbit absolute -right-3 bottom-52 z-0 h-36 w-36" />
                    <div className="absolute right-16 bottom-44 z-0 w-56">
                        <div className="brand-arrow-line w-48" />
                        <div className="ml-auto h-8 w-8 -translate-y-5 rotate-12 border-t-[10px] border-r-[10px] border-brand-pink" />
                    </div>
                </aside>

                <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.55 }}
                        className="w-full max-w-md"
                    >
                        <div className="mb-10 flex items-center gap-3 lg:hidden">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl">
                                <img
                                    src="/logo-color.png"
                                    alt="Havifin"
                                    className="brand-logo-crop h-full w-full object-contain"
                                />
                            </div>
                            <div>
                                <p className="text-xl font-black text-brand-blue">
                                    havifin
                                </p>
                                <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                    Finance en mouvement
                                </p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="brand-kicker">
                                Espace sécurisé Havifin
                            </p>
                            <h2 className="brand-title mt-3 text-4xl text-slate-950 sm:text-5xl">
                                {requiresTwoFactor
                                    ? 'Confirmez votre identité.'
                                    : 'Heureux de vous revoir.'}
                            </h2>
                            <p className="mt-4 leading-6 font-medium text-slate-500">
                                {requiresTwoFactor
                                    ? 'Saisissez le code fourni par votre application d’authentification.'
                                    : 'Connectez-vous pour accéder à votre espace de gestion.'}
                            </p>
                        </div>

                        <div className="brand-panel rounded-[2rem] p-6 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {!requiresTwoFactor && (
                                    <>
                                        <Field
                                            label="Adresse email"
                                            error={errors.email}
                                        >
                                            <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-brand-blue" />
                                            <Input
                                                type="email"
                                                autoComplete="email"
                                                value={formData.email}
                                                onChange={(event) =>
                                                    setFormData({
                                                        ...formData,
                                                        email: event.target
                                                            .value,
                                                    })
                                                }
                                                placeholder="vous@havifin.com"
                                                className="h-14 pl-12"
                                                required
                                                disabled={isLoading}
                                            />
                                        </Field>

                                        <Field
                                            label="Mot de passe"
                                            error={errors.password}
                                        >
                                            <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-brand-blue" />
                                            <Input
                                                type="password"
                                                autoComplete="current-password"
                                                value={formData.password}
                                                onChange={(event) =>
                                                    setFormData({
                                                        ...formData,
                                                        password:
                                                            event.target.value,
                                                    })
                                                }
                                                placeholder="••••••••"
                                                className="h-14 pl-12"
                                                required
                                                disabled={isLoading}
                                            />
                                        </Field>
                                    </>
                                )}

                                {requiresTwoFactor && (
                                    <Field label="Code d’authentification">
                                        <ShieldCheck className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-brand-blue" />
                                        <Input
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            value={twoFactorCode}
                                            onChange={(event) =>
                                                setTwoFactorCode(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="123456"
                                            className="h-14 pl-12 text-center text-xl font-black tracking-[0.3em]"
                                            required
                                            disabled={isLoading}
                                        />
                                    </Field>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="h-14 w-full rounded-2xl text-base"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                                            Connexion en cours...
                                        </>
                                    ) : (
                                        <>
                                            {requiresTwoFactor
                                                ? 'Valider le code'
                                                : 'Se connecter'}
                                            <ArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                            <ShieldCheck className="h-4 w-4 text-brand-cyan" />
                            Connexion chiffrée et protégée
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label className="ml-1 text-xs font-black tracking-wide text-slate-700">
                {label}
            </Label>
            <div className="relative">{children}</div>
            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
