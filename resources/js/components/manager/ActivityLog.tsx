import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronRight, Clock, User as UserIcon } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import UserActivityDetail from './UserActivityDetail';

interface ActivityLogProps {
    selectedDate: string;
}

export default function ActivityLog({ selectedDate }: ActivityLogProps) {
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const { data: stats = [], isLoading: loadingStats } = useQuery({
        queryKey: ['cashier-stats', selectedDate],
        queryFn: () =>
            base44.entities.CashierActivity.stats({
                date: selectedDate,
            }) as Promise<any[]>,
    });

    const { data: activities = [], isLoading: loadingActivities } = useQuery({
        queryKey: ['cashier-activities', selectedDate],
        queryFn: () =>
            base44.entities.CashierActivity.list({ date: selectedDate }),
    });

    const getActivityIcon = (type: string, description?: string) => {
        const desc = description?.toLowerCase() || '';

        if (type === 'complete_transaction') {
            if (desc.includes('taux'))
                return (
                    <Badge className="border-none bg-amber-100 text-amber-600">
                        TAUX
                    </Badge>
                );
            if (desc.includes('boutique'))
                return (
                    <Badge className="border-none bg-purple-100 text-purple-600">
                        BOUTIQUE
                    </Badge>
                );
            if (desc.includes('utilisateur'))
                return (
                    <Badge className="border-none bg-blue-100 text-blue-600">
                        USER
                    </Badge>
                );
            if (desc.includes('partenaire'))
                return (
                    <Badge className="border-none bg-pink-100 text-pink-600">
                        PARTENAIRE
                    </Badge>
                );
            if (desc.includes('publicité'))
                return (
                    <Badge className="border-none bg-rose-100 text-rose-600">
                        PUB
                    </Badge>
                );
            if (desc.includes('guichet'))
                return (
                    <Badge className="border-none bg-cyan-100 text-cyan-600">
                        GUICHET
                    </Badge>
                );

            return (
                <Badge className="border-none bg-indigo-100 text-indigo-600">
                    OPÉRATION
                </Badge>
            );
        }

        switch (type) {
            case 'login':
                return (
                    <Badge className="border-none bg-emerald-100 text-emerald-600">
                        CONNEXION
                    </Badge>
                );
            case 'logout':
                return (
                    <Badge className="border-none bg-slate-100 text-slate-600">
                        DÉCONNEXION
                    </Badge>
                );
            default:
                return (
                    <Badge className="border-none bg-slate-100 text-slate-500">
                        {type.toUpperCase()}
                    </Badge>
                );
        }
    };

    if (loadingStats || loadingActivities) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                <p className="mt-4 text-xs font-black tracking-widest text-slate-400 uppercase">
                    Calcul des performances...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div>
                <h3 className="mb-2 text-2xl font-black tracking-tight text-slate-800">
                    Journal d'activité
                </h3>
                <p className="text-sm font-medium text-slate-400">
                    Performance et mouvements des utilisateurs pour le{' '}
                    {moment(selectedDate).format('DD/MM/YYYY')}
                </p>
            </div>

            {/* Users Summary List */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stats.length > 0 ? (
                    stats.map((user: any) => (
                        <Card
                            key={user.cashier_id}
                            onClick={() => setSelectedUser(user)}
                            className="group cursor-pointer rounded-3xl border-slate-100 bg-white shadow-sm transition-all hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-95"
                        >
                            <CardContent className="p-6">
                                <div className="mb-6 flex items-center justify-between">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                                        {user.cashier_name.charAt(0)}
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-600" />
                                </div>
                                <h4 className="mb-1 text-lg font-black text-slate-900">
                                    {user.cashier_name}
                                </h4>
                                <div className="mb-6 flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className="border-emerald-100 text-[10px] font-bold text-emerald-600"
                                    >
                                        {user.connection_time
                                            ? `À ${user.connection_time}`
                                            : 'Non connecté'}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-bold"
                                    >
                                        {user.transactions_completed} Opérations
                                    </Badge>
                                </div>
                                <div className="space-y-2 border-t border-slate-50 pt-4">
                                    <div className="flex justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                        <span>Volume USD</span>
                                        <span className="font-black text-slate-900">
                                            ${' '}
                                            {user.detailed_stats.total_amount_usd.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full rounded-[2.5rem] border-2 border-dashed border-slate-100 py-10 text-center">
                        <UserIcon className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                        <p className="text-xs font-black tracking-widest text-slate-300 uppercase">
                            Aucun utilisateur actif ce jour
                        </p>
                    </div>
                )}
            </div>

            {/* General Log Timeline */}
            <div className="space-y-6 border-t border-slate-100 pt-10">
                <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black tracking-tight text-slate-800">
                        Derniers Événements
                    </h4>
                </div>

                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <Activity className="mb-4 h-16 w-16 text-slate-200" />
                        <p className="text-xs font-black tracking-widest text-slate-400 uppercase">
                            Aucun événement enregistré
                        </p>
                    </div>
                ) : (
                    <div className="relative space-y-4">
                        {activities.map((activity: any, idx: number) => (
                            <div
                                key={activity.id}
                                className="relative flex gap-4"
                            >
                                {idx !== activities.length - 1 && (
                                    <div className="absolute top-10 left-[19px] h-full w-[2px] bg-slate-100" />
                                )}
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-100 bg-white">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="flex-1 rounded-2xl border border-slate-100 bg-white/50 p-5 shadow-sm transition-all hover:bg-white">
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-900">
                                                {moment(
                                                    activity.created_at,
                                                ).format('HH:mm:ss')}
                                            </span>
                                            {getActivityIcon(
                                                activity.activity_type,
                                                activity.description,
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                            <UserIcon className="h-3 w-3" />
                                            {activity.cashier?.name ||
                                                activity.cashier_name ||
                                                'Système'}
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium text-slate-600">
                                        {activity.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <UserActivityDetail
                user={selectedUser}
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
            />
        </div>
    );
}
