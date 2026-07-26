import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm } from '@inertiajs/react';

export default function Password() {
    const form = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    return (
        <main className="mx-auto max-w-xl space-y-6 p-6">
            <Head title="Mot de passe" />
            <h1 className="text-2xl font-bold">Changer le mot de passe</h1>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put('/settings/password', {
                        onFinish: () => form.reset(),
                    });
                }}
            >
                <Input
                    type="password"
                    placeholder="Mot de passe actuel"
                    value={form.data.current_password}
                    onChange={(event) =>
                        form.setData('current_password', event.target.value)
                    }
                    required
                />
                <Input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={form.data.password}
                    onChange={(event) =>
                        form.setData('password', event.target.value)
                    }
                    required
                />
                <Input
                    type="password"
                    placeholder="Confirmation"
                    value={form.data.password_confirmation}
                    onChange={(event) =>
                        form.setData(
                            'password_confirmation',
                            event.target.value,
                        )
                    }
                    required
                />
                <Button disabled={form.processing}>Enregistrer</Button>
            </form>
        </main>
    );
}
