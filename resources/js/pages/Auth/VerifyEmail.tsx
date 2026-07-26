import { Button } from '@/components/ui/button';
import { Head, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }: { status?: string }) {
    const form = useForm({});

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6 text-center">
            <Head title="Vérification de l’e-mail" />
            <h1 className="text-2xl font-bold">
                Vérifiez votre adresse e-mail
            </h1>
            <p>Un lien de vérification vous a été envoyé.</p>
            {status === 'verification-link-sent' && (
                <p className="text-sm text-green-700">
                    Un nouveau lien a été envoyé.
                </p>
            )}
            <Button
                disabled={form.processing}
                onClick={() => form.post('/email/verification-notification')}
            >
                Renvoyer le lien
            </Button>
        </main>
    );
}
