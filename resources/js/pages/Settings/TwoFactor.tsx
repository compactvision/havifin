import { Head } from '@inertiajs/react';

export default function TwoFactor({
    twoFactorEnabled,
}: {
    twoFactorEnabled: boolean;
}) {
    return (
        <main className="mx-auto max-w-xl space-y-6 p-6">
            <Head title="Double authentification" />
            <h1 className="text-2xl font-bold">Double authentification</h1>
            <p>
                État : {twoFactorEnabled ? 'activée' : 'désactivée'}. La gestion
                sécurisée est disponible depuis les actions Fortify du compte.
            </p>
        </main>
    );
}
