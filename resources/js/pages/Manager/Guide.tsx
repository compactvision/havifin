import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppMain from '@/layouts/app-main';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    ArrowRightLeft,
    Banknote,
    LayoutDashboard,
    Play,
    Search,
    Settings,
    Store,
    Users,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface GuideSection {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    summary: string;
    points: string[];
}

const SECTIONS: GuideSection[] = [
    {
        id: 'overview',
        label: "Vue d'ensemble",
        icon: LayoutDashboard,
        summary:
            "L'écran d'accueil de la console. Il montre en un coup d'œil l'activité de la boutique sélectionnée pour la date choisie.",
        points: [
            'Les 4 cartes en haut (Clients, Volume USD, Volume CDF, Commissions) résument la journée sélectionnée avec le sélecteur de date en haut à droite.',
            '« Répartition des opérations » et « Activité par partenaire » se remplissent automatiquement dès qu\'il y a des transactions ce jour-là — vide sinon, ce n\'est pas une erreur.',
            'Le bouton « Exporter Rapport » télécharge un CSV des transactions du jour sélectionné.',
            'Le sélecteur de boutique en haut permet de changer d\'agence si vous en gérez plusieurs.',
        ],
    },
    {
        id: 'transactions',
        label: 'Flux Transactions',
        icon: ArrowRightLeft,
        summary:
            'Le journal complet des opérations (dépôts, retraits, changes, paiements) traitées par les caissiers.',
        points: [
            'Filtrable par date et par texte libre (numéro de ticket, nom de client, montant).',
            'Chaque ligne correspond à une transaction déjà validée par un caissier — pas les tickets encore en attente.',
            "Le filtre par date se base sur la session journalière de la transaction, pas sur l'heure exacte de création — une transaction saisie après minuit peut encore apparaître sous la date d'ouverture de la session.",
        ],
    },
    {
        id: 'movements',
        label: 'Mouvements Manuels',
        icon: Banknote,
        summary:
            "Pour enregistrer un mouvement de caisse qui ne provient pas d'une opération client (approvisionnement, prélèvement, ajustement).",
        points: [
            "Utilisez ceci pour les entrées/sorties de fonds que le caissier n'a pas saisies via une opération normale.",
            'Chaque mouvement manuel est tracé avec un motif obligatoire et apparaît ensuite dans le détail de la session de caisse concernée.',
        ],
    },
    {
        id: 'rates',
        label: 'Gestion Taux',
        icon: Settings,
        summary:
            'Les taux de change actifs utilisés pour calculer automatiquement les opérations de change des caissiers.',
        points: [
            "Un taux doit être actif pour la paire de devises concernée, sinon le caissier ne peut pas valider une opération de change dans cette paire.",
            'Pensez à mettre à jour les taux en début de journée avant l\'ouverture — les caissiers ne voient que les taux actifs au moment de la transaction.',
        ],
    },
    {
        id: 'users',
        label: 'Utilisateurs',
        icon: Users,
        summary:
            "Gestion des comptes de l'équipe (caissiers, autres managers) : création, activation/désactivation, rôle.",
        points: [
            "Un compte désactivé ne peut plus se connecter, mais son historique de transactions reste intact.",
            "C'est ici que vous créez un compte caissier — l'affectation à un guichet précis se fait ensuite dans la fiche de la boutique (Configuration des Guichets).",
        ],
    },
    {
        id: 'clients',
        label: 'Base Clients',
        icon: Users,
        summary:
            "L'historique de tous les clients qui sont passés par le kiosque, tous statuts confondus (en attente, terminé, annulé).",
        points: [
            "Cliquer sur un client ouvre sa fiche détaillée avec ses tickets précédents.",
            "Utile pour retrouver un client par numéro de téléphone en cas de litige ou de question sur une opération passée.",
        ],
    },
    {
        id: 'institutions',
        label: 'Banques & Partenaires',
        icon: Store,
        summary:
            "La liste des services proposés au kiosque (M-Pesa, Airtel Money, virements bancaires, etc.) que le client choisit à l'écran.",
        points: [
            "Désactiver un partenaire ici le retire immédiatement de l'écran de sélection du kiosque, sans supprimer l'historique des opérations déjà faites avec lui.",
        ],
    },
    {
        id: 'logs',
        label: 'Journal Activité',
        icon: Activity,
        summary:
            "La trace de toutes les actions sensibles effectuées dans le système (connexions, modifications de taux, annulations, etc.).",
        points: [
            "Sert principalement à l'audit : retrouver qui a fait quoi et quand en cas de désaccord ou d'anomalie.",
        ],
    },
    {
        id: 'sessions',
        label: 'Gestion Sessions',
        icon: Play,
        summary:
            "La session journalière de la boutique — celle qui doit être ouverte pour que les clients puissent prendre un ticket au kiosque.",
        points: [
            "C'est le manager qui ouvre et ferme cette session, une fois par jour et par boutique.",
            "Tant qu'elle n'est pas ouverte, le kiosque client refuse les nouveaux tickets avec le message « Agence fermée ».",
            "La fermer ne clôture pas automatiquement les caisses individuelles des caissiers — voir « Ouverture de caisse » ci-dessous.",
        ],
    },
    {
        id: 'counters',
        label: 'Guichets & Affectation Caissier',
        icon: Users,
        summary:
            "Se trouve dans la fiche de chaque boutique (Mes Boutiques → boutique → Configuration des Guichets), pas dans le menu principal.",
        points: [
            "Un guichet est créé une fois, puis un caissier lui est assigné via « Changer le caissier » / « Assigner un caissier ».",
            "Cette affectation crée automatiquement la caisse liée à ce guichet — un caissier ne peut ouvrir que la caisse de son propre guichet, jamais une autre.",
            "Pour réaffecter un caissier à un autre guichet, changez d'abord son affectation ici ; il ne peut être que sur un seul guichet à la fois.",
        ],
    },
    {
        id: 'cashsessions',
        label: 'Ouverture de Caisse & Fond',
        icon: Wallet,
        summary:
            "Le caissier ouvre sa caisse (menu → Caisse) une fois affecté à un guichet et la session journalière de la boutique active.",
        points: [
            "À l'ouverture, le caissier saisit le fond de caisse de départ, devise par devise (USD, CDF, EUR).",
            "Pendant la session, le montant théorique se recalcule automatiquement à partir du fond de départ et des mouvements (entrées/sorties).",
            "À la clôture, le caissier compte physiquement l'argent et saisit le montant réel — l'écart avec le montant théorique est calculé et enregistré, c'est ce qui sert à l'analyse de performance.",
            "Un manager peut aussi ouvrir la caisse au nom du caissier assigné si besoin.",
        ],
    },
    {
        id: 'cancelled-tickets',
        label: 'Tickets Annulés',
        icon: Activity,
        summary:
            "Un ticket annulé par un caissier reste visible dans la colonne « Derniers Traités » du terminal caisse, pas seulement les tickets terminés.",
        points: [
            "Il apparaît avec un badge rouge « Annulé » et, si le caissier en a saisi un, le motif de l'annulation.",
            "Contrairement à un ticket terminé, aucune transaction financière n'y est rattachée — rien à réimprimer.",
        ],
    },
];

export default function ManagerGuide() {
    const [query, setQuery] = useState('');

    const filteredSections = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return SECTIONS;
        return SECTIONS.filter(
            (s) =>
                s.label.toLowerCase().includes(q) ||
                s.summary.toLowerCase().includes(q) ||
                s.points.some((p) => p.toLowerCase().includes(q)),
        );
    }, [query]);

    const scrollTo = (id: string) => {
        document
            .getElementById(id)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <AppMain currentPageName="ManagerGuide">
            <Head title="Guide Manager" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 py-8 md:px-10">
                <header className="mb-8 flex flex-wrap items-center gap-4">
                    <Link href="/manager">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-2xl border border-white/40 bg-white/50 shadow-sm backdrop-blur-md hover:bg-white/80"
                        >
                            <ArrowLeft className="h-5 w-5 text-indigo-600" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                            Guide{' '}
                            <span className="text-indigo-600">Manager</span>
                        </h1>
                        <p className="mt-1 text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
                            Documentation des fonctionnalités
                        </p>
                    </div>
                </header>

                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Table of contents + search */}
                    <aside className="shrink-0 lg:sticky lg:top-8 lg:h-fit lg:w-[280px]">
                        <div className="rounded-[2rem] bg-white/70 p-5 shadow-sm backdrop-blur-xl">
                            <div className="group relative mb-4">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Rechercher une fonctionnalité..."
                                    value={query}
                                    onChange={(e) =>
                                        setQuery(e.target.value)
                                    }
                                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm font-medium"
                                />
                            </div>
                            <h3 className="mb-3 px-1 text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                                Table des matières
                            </h3>
                            <nav className="space-y-1">
                                {filteredSections.map((s) => {
                                    const Icon = s.icon;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => scrollTo(s.id)}
                                            className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                        >
                                            <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                            <span className="whitespace-nowrap">
                                                {s.label}
                                            </span>
                                        </button>
                                    );
                                })}
                                {filteredSections.length === 0 && (
                                    <p className="p-2.5 text-sm text-slate-400">
                                        Aucun résultat pour « {query} ».
                                    </p>
                                )}
                            </nav>
                        </div>
                    </aside>

                    {/* Content */}
                    <main className="min-w-0 flex-1 space-y-6">
                        {filteredSections.map((s) => {
                            const Icon = s.icon;
                            return (
                                <section
                                    key={s.id}
                                    id={s.id}
                                    className={cn(
                                        'scroll-mt-8 rounded-[2rem] border border-slate-200/60 bg-white p-7 shadow-sm',
                                    )}
                                >
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                                            <Icon className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            {s.label}
                                        </h2>
                                    </div>
                                    <p className="mb-4 text-sm font-medium text-slate-500">
                                        {s.summary}
                                    </p>
                                    <ul className="space-y-2">
                                        {s.points.map((point, i) => (
                                            <li
                                                key={i}
                                                className="flex gap-2.5 text-sm text-slate-700"
                                            >
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                        {filteredSections.length === 0 && (
                            <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                                <p className="text-sm font-bold text-slate-400 uppercase">
                                    Aucune fonctionnalité ne correspond à
                                    votre recherche
                                </p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </AppMain>
    );
}
