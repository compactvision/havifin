import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm } from '@inertiajs/react';

interface Props {
    email: string;
    token: string;
}

export default function ResetPassword({ email, token }: Props) {
    const form = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
            <Head title="Nouveau mot de passe" />
            <h1 className="text-2xl font-bold">
                Choisir un nouveau mot de passe
            </h1>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/reset-password', {
                        onFinish: () =>
                            form.reset('password', 'password_confirmation'),
                    });
                }}
            >
                <Input
                    type="email"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    required
                />
                <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nouveau mot de passe"
                    value={form.data.password}
                    onChange={(event) =>
                        form.setData('password', event.target.value)
                    }
                    required
                />
                <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirmer le mot de passe"
                    value={form.data.password_confirmation}
                    onChange={(event) =>
                        form.setData(
                            'password_confirmation',
                            event.target.value,
                        )
                    }
                    required
                />
                {Object.values(form.errors).map((error) => (
                    <p key={error} className="text-sm text-red-600">
                        {error}
                    </p>
                ))}
                <Button className="w-full" disabled={form.processing}>
                    Enregistrer
                </Button>
            </form>
        </main>
    );
}
