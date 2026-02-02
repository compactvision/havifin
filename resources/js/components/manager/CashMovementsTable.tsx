import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CashMovement } from '@/types/cash';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Banknote,
    Calendar,
    User,
} from 'lucide-react';
import moment from 'moment';

interface Props {
    movements: CashMovement[];
}

export function CashMovementsTable({ movements }: Props) {
    if (movements.length === 0) {
        return (
            <div className="flex h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/50">
                <Banknote className="mb-2 h-8 w-8 text-slate-200" />
                <p className="text-xs font-black tracking-widest text-slate-400 uppercase">
                    Aucun mouvement manuel aujourd'hui
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-slate-50 bg-slate-50/50 hover:bg-slate-50/50">
                        <TableHead className="w-[120px] text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            Heure
                        </TableHead>
                        <TableHead className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            Type
                        </TableHead>
                        <TableHead className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            Montant
                        </TableHead>
                        <TableHead className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            Motif / Description
                        </TableHead>
                        <TableHead className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            Caissier
                        </TableHead>
                        <TableHead className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            Boutique
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movements.map((movement, idx) => {
                        const isPositive = movement.amount > 0;
                        return (
                            <TableRow
                                key={movement.id}
                                className="group transition-colors hover:bg-slate-50/50"
                            >
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2 font-bold text-slate-400">
                                        <Calendar className="h-3 w-3" />
                                        {moment(movement.created_at).format(
                                            'HH:mm',
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase ${
                                            isPositive
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-rose-50 text-rose-600'
                                        }`}
                                    >
                                        {isPositive ? (
                                            <ArrowUpRight className="h-3 w-3" />
                                        ) : (
                                            <ArrowDownLeft className="h-3 w-3" />
                                        )}
                                        {isPositive ? 'Entrée' : 'Sortie'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div
                                        className={`text-sm font-black ${
                                            isPositive
                                                ? 'text-emerald-600'
                                                : 'text-rose-600'
                                        }`}
                                    >
                                        {isPositive ? '+' : ''}
                                        {parseFloat(
                                            movement.amount as any,
                                        ).toLocaleString()}{' '}
                                        <span className="text-[10px] opacity-70">
                                            {movement.currency}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="max-w-[200px] truncate text-xs font-bold text-slate-600">
                                        {movement.description}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                                            <User className="h-3 w-3 text-slate-400" />
                                        </div>
                                        {movement.user?.name || 'Inconnu'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                                        {movement.session?.register?.shop
                                            ?.name || '-'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
