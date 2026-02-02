import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Activity,
    ArrowDownLeft,
    ArrowUpRight,
    Clock,
    History,
    TrendingUp,
} from 'lucide-react';

interface UserActivityDetailProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserActivityDetail({
    user,
    isOpen,
    onClose,
}: UserActivityDetailProps) {
    if (!user) return null;

    const stats = user.detailed_stats;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="overflow-y-auto border-none bg-slate-50 p-0 sm:max-w-[600px]">
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="px-8 py-10">
                    <SheetHeader className="mb-10">
                        <div className="mb-4 flex items-center gap-6">
                            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-600 text-3xl font-black text-white shadow-xl shadow-indigo-200">
                                {user.cashier_name.charAt(0)}
                            </div>
                            <div>
                                <SheetTitle className="mb-1 text-3xl leading-none font-black text-slate-900">
                                    {user.cashier_name}
                                </SheetTitle>
                                <SheetDescription className="text-xs font-bold tracking-widest text-indigo-500 uppercase">
                                    {user.cashier_email}
                                </SheetDescription>
                                <div className="mt-4 flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className="rounded-xl border-emerald-100 bg-emerald-50 font-bold text-emerald-600"
                                    >
                                        <Clock className="mr-1.5 h-3 w-3" />
                                        Connecté à{' '}
                                        {user.connection_time || '--:--'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* KPI Grid */}
                    <div className="mb-10 grid grid-cols-2 gap-4">
                        <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="rounded-xl bg-emerald-50 p-2">
                                        <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider text-emerald-600 uppercase">
                                        Dépôts
                                    </span>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900">
                                    {stats.deposits}
                                </h4>
                                <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">
                                    Actions aujourd'hui
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="rounded-xl bg-rose-50 p-2">
                                        <ArrowUpRight className="h-5 w-5 text-rose-600" />
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider text-rose-600 uppercase">
                                        Retraits
                                    </span>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900">
                                    {stats.withdrawals}
                                </h4>
                                <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">
                                    Actions aujourd'hui
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="rounded-xl bg-amber-50 p-2">
                                        <TrendingUp className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider text-amber-600 uppercase">
                                        Changes
                                    </span>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900">
                                    {stats.exchanges}
                                </h4>
                                <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">
                                    Opérations
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-sm">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="rounded-xl bg-indigo-50 p-2">
                                        <History className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider text-indigo-600 uppercase">
                                        Mouvements
                                    </span>
                                </div>
                                <h4 className="text-2xl font-black text-slate-900">
                                    {stats.adjustments_in +
                                        stats.adjustments_out}
                                </h4>
                                <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">
                                    Manuels (In/Out)
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mb-10 space-y-4">
                        <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Volume Traité (USD)
                                </p>
                                <h3 className="text-2xl font-black">
                                    $ {stats.total_amount_usd.toLocaleString()}
                                </h3>
                            </div>
                            <div className="h-10 w-[1px] bg-slate-800" />
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Volume Traité (CDF)
                                </p>
                                <h3 className="text-2xl font-black">
                                    {stats.total_amount_cdf.toLocaleString()} FC
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-indigo-600" />
                            <h4 className="text-lg font-black tracking-tight text-slate-800">
                                Dernières Activités
                            </h4>
                        </div>

                        <div className="space-y-4">
                            {user.recent_activities.map(
                                (activity: any, idx: number) => (
                                    <div
                                        key={activity.id}
                                        className="relative flex gap-4"
                                    >
                                        {idx !==
                                            user.recent_activities.length -
                                                1 && (
                                            <div className="absolute top-10 left-[19px] h-full w-[2px] bg-slate-100" />
                                        )}
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-[10px] font-black text-slate-400 shadow-sm">
                                            {activity.time}
                                        </div>
                                        <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                            <p className="mb-1 text-xs font-bold tracking-wider text-indigo-500 uppercase">
                                                {activity.type}
                                            </p>
                                            <p className="text-sm leading-snug font-medium text-slate-600">
                                                {activity.description}
                                            </p>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
