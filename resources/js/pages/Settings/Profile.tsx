import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm, usePage } from '@inertiajs/react';

export default function Profile() {
    const user = (
        usePage().props.auth as { user: { name: string; email: string } }
    ).user;
    const form = useForm({ name: user.name, email: user.email });

    return (
        <main className="mx-auto max-w-xl space-y-6 p-6">
            <Head title="Profil" />
            <h1 className="text-2xl font-bold">Profil</h1>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.patch('/settings/profile');
                }}
            >
                <Input
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    required
                />
                <Input
                    type="email"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    required
                />
                <Button disabled={form.processing}>Enregistrer</Button>
            </form>
        </main>
    );
}
