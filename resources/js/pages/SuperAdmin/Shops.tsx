import ShopManager from '@/components/manager/ShopManager';
import AppMain from '@/layouts/app-main';
import { Head } from '@inertiajs/react';
import { ArrowUpRight, Building2, ShieldCheck } from 'lucide-react';

export default function Shops() {
    return (
        <AppMain currentPageName="Admin">
            <Head title="Gestion des Boutiques" />

            <div className="@container min-h-screen pb-20">
                <section className="brand-hero relative overflow-hidden px-6 py-12 text-white sm:px-10 lg:py-16">
                    <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black tracking-[0.22em] uppercase backdrop-blur-xl">
                                <ShieldCheck className="h-4 w-4 text-brand-cyan" />
                                Console Super Admin
                            </div>
                            <h1 className="brand-title text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">
                                Votre réseau,
                                <span className="block text-brand-cyan">
                                    boutique par boutique.
                                </span>
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 font-medium text-white/65">
                                Ajoutez vos points de vente, nommez les managers
                                responsables et suivez leurs performances en
                                temps réel.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                                <Building2 className="mb-3 h-5 w-5 text-brand-pink" />
                                <p className="text-sm font-black">
                                    Vue centralisée
                                </p>
                                <p className="mt-1 text-xs text-white/50">
                                    Toutes vos boutiques
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                                <ArrowUpRight className="mb-3 h-5 w-5 text-brand-cyan" />
                                <p className="text-sm font-black">Temps réel</p>
                                <p className="mt-1 text-xs text-white/50">
                                    Indicateurs actualisés
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="relative z-10 mx-auto -mt-5 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="brand-panel rounded-[2rem] p-5 sm:p-7">
                        <ShopManager />
                    </div>
                </div>
            </div>
        </AppMain>
    );
}
