import AppearanceTabs from '@/components/appearance-tabs';
import { Head } from '@inertiajs/react';

export default function Appearance() {
    return (
        <main className="mx-auto max-w-xl space-y-6 p-6">
            <Head title="Apparence" />
            <h1 className="text-2xl font-bold">Apparence</h1>
            <AppearanceTabs />
        </main>
    );
}
