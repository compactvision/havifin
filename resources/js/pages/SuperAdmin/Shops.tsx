import ShopManager from '@/components/manager/ShopManager';
import AppMain from '@/layouts/app-main';
import { Head } from '@inertiajs/react';
import { Store } from 'lucide-react';

export default function Shops() {
    return (
        <AppMain currentPageName="Admin">
            <Head title="Gestion des Boutiques" />

            <div className="@container flex h-full flex-col">
                <div className="flex-1 space-y-4 p-8 pt-6">
                    <div className="flex items-center justify-between space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-600/20">
                                <Store className="h-5 w-5" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">
                                Administration
                            </h2>
                        </div>
                    </div>

                    <div className="mt-8">
                        <ShopManager />
                    </div>
                </div>
            </div>
        </AppMain>
    );
}
