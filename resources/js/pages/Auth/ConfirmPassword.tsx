import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const form = useForm({ password: '' });

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
            <Head title="Confirmation du mot de passe" />
            <h1 className="text-2xl font-bold">Confirmez votre mot de passe</h1>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post('/user/confirm-password', {
                        onFinish: () => form.reset('password'),
                    });
                }}
            >
                <Input
                    type="password"
                    autoComplete="current-password"
                    value={form.data.password}
                    onChange={(event) =>
                        form.setData('password', event.target.value)
                    }
                    required
                />
                {form.errors.password && (
                    <p className="text-sm text-red-600">
                        {form.errors.password}
                    </p>
                )}
                <Button className="w-full" disabled={form.processing}>
                    Confirmer
                </Button>
            </form>
        </main>
    );
}
