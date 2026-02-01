import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CashRegister } from '@/types/cash';
import { Link } from '@inertiajs/react';
import { Clock, History, Lock, Unlock, User } from 'lucide-react';
import moment from 'moment';

interface Props {
    register: CashRegister;
    onOpenSession: (register: CashRegister) => void;
}

export default function CashRegisterCard({ register, onOpenSession }: Props) {
    const activeSession = register.active_session;
    const balances = register.balances || [];

    return (
        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-lg">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-900">
                        {register.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                        {register.shop?.name} •{' '}
                        {register.counter?.name || 'Sans guichet'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/cash/registers/${register.id}/history`}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        >
                            <History className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Badge
                        className={`rounded-full px-2 py-1 text-xs font-black uppercase ${
                            activeSession
                                ? 'bg-green-100 text-green-600'
                                : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                        {activeSession ? (
                            <Unlock className="mr-1 h-3 w-3" />
                        ) : (
                            <Lock className="mr-1 h-3 w-3" />
                        )}
                        {activeSession ? 'Ouverte' : 'Fermée'}
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {activeSession ? (
                    <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase">
                                    Responsable
                                </div>
                                <div className="font-bold text-slate-900">
                                    Caissier #{activeSession.user_id}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase">
                                    Ouverte depuis
                                </div>
                                <div className="font-bold text-slate-900">
                                    {moment(activeSession.opened_at).fromNow()}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 text-center">
                        <div className="mb-2 rounded-full bg-slate-100 p-3 text-slate-400">
                            <History className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-slate-500">
                            Caisse fermée
                        </p>
                    </div>
                )}

                {/* Balance Preview (Optional) */}
                {/* Only show balances if available and useful */}

                {/* Actions */}
                {activeSession ? (
                    <Link
                        href={`/cash/sessions/${activeSession.id}`}
                        className="block w-full"
                    >
                        <Button className="h-12 w-full rounded-xl bg-blue-600 font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-xl">
                            Accéder à la session
                        </Button>
                    </Link>
                ) : (
                    <Button
                        onClick={() => onOpenSession(register)}
                        className="h-12 w-full rounded-xl bg-slate-900 font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl"
                    >
                        Ouvrir la caisse
                    </Button>
                )}
            </div>
        </div>
    );
}
