import { Transaction } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Clock, Hash, User } from 'lucide-react';
import moment from 'moment';

interface TransactionsTableProps {
    transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <Hash className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-xs font-black tracking-widest text-slate-400 uppercase">
                    Aucune transaction trouvée
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 text-left">
                <thead>
                    <tr className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                        <th className="px-6 py-4 font-black">
                            Transaction / Client
                        </th>
                        <th className="px-6 py-4 text-center font-black">
                            Type
                        </th>
                        <th className="px-6 py-4 text-right font-black">
                            Montant Entrée
                        </th>
                        <th className="px-6 py-4 text-right font-black">
                            Montant Sortie
                        </th>
                        <th className="px-6 py-4 text-right font-black">
                            Commission
                        </th>
                        <th className="px-6 py-4 text-right font-black">
                            Date / Heure
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <tr
                            key={tx.id}
                            className="group rounded-2xl border border-slate-100 bg-white transition-all duration-300 hover:bg-slate-50"
                        >
                            <td className="rounded-l-2xl border-y border-l border-slate-100 px-6 py-5 group-hover:border-indigo-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10 transition-transform group-hover:scale-110">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-sm font-black text-slate-900">
                                            {tx.client_name || 'Utilisateur'}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                                            <Hash className="h-2.5 w-2.5" /> ID-
                                            {tx.id
                                                .toString()
                                                .slice(-4)
                                                .toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 text-center group-hover:border-indigo-100">
                                <div
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase',
                                        tx.operation_type === 'change'
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'bg-amber-50 text-amber-600',
                                    )}
                                >
                                    {tx.operation_type === 'change' ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownLeft className="h-3 w-3" />
                                    )}
                                    {tx.operation_type}
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 text-right group-hover:border-indigo-100">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900">
                                        {tx.amount_from?.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-black tracking-tighter text-slate-400 uppercase">
                                        {tx.currency_from}
                                    </span>
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 text-right group-hover:border-indigo-100">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-emerald-600">
                                        {tx.amount_to?.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-black tracking-tighter text-emerald-600 uppercase opacity-60">
                                        {tx.currency_to}
                                    </span>
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 text-right group-hover:border-indigo-100">
                                <span className="rounded-lg bg-slate-900 px-3 py-1 font-mono text-xs font-black text-white shadow-lg shadow-slate-900/10">
                                    $
                                    {parseFloat(
                                        tx.commission as any,
                                    ).toLocaleString()}
                                </span>
                            </td>
                            <td className="rounded-r-2xl border-y border-r border-slate-100 px-6 py-5 text-right group-hover:border-indigo-100">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-700">
                                        {moment(tx.created_date).format(
                                            'DD/MM/YYYY',
                                        )}
                                    </span>
                                    <span className="flex items-center justify-end gap-1 text-[10px] font-bold text-slate-400">
                                        <Clock className="h-2.5 w-2.5" />{' '}
                                        {moment(tx.created_date).format(
                                            'HH:mm',
                                        )}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
