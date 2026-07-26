import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }: { status?: string }) {
    const form = useForm({ email: '' });

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
            <Head title="Mot de passe oublié" />
            <h1 className="text-2xl font-bold">
                Réinitialiser le mot de passe
            </h1>
            {status && <p className="text-sm text-green-700">{status}</p>}
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/forgot-password');
                }}
            >
                <Input
                    type="email"
                    autoComplete="email"
                    placeholder="Adresse e-mail"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    required
                />
                {form.errors.email && (
                    <p className="text-sm text-red-600">{form.errors.email}</p>
                )}
                <Button className="w-full" disabled={form.processing}>
                    Envoyer le lien
                </Button>
            </form>
        </main>
    );
}
