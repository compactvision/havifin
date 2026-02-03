import { Client } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Eye, Hash, Phone, User } from 'lucide-react';
import moment from 'moment';

import { Skeleton } from '@/components/ui/skeleton';

interface ClientsTableProps {
    clients: Client[];
    isLoading?: boolean;
}

export function ClientsTable({ clients, isLoading }: ClientsTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-6"
                    >
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-10" />
                    </div>
                ))}
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <User className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-xs font-black tracking-widest text-slate-400 uppercase">
                    Aucun client trouvé
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 text-left">
                <thead>
                    <tr className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                        <th className="px-6 py-4 font-black">Client</th>
                        <th className="px-6 py-4 font-black">
                            Numéro de téléphone
                        </th>
                        <th className="px-6 py-4 text-center font-black">
                            Statut
                        </th>
                        <th className="px-6 py-4 text-right font-black">
                            Inscrit le
                        </th>
                        <th className="px-6 py-4 text-right font-black">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => (
                        <tr
                            key={client.id}
                            className="group rounded-2xl border border-slate-100 bg-white transition-all duration-300 hover:bg-slate-50"
                        >
                            <td className="rounded-l-2xl border-y border-l border-slate-100 px-6 py-5 group-hover:border-indigo-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10 transition-transform group-hover:scale-110">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-sm font-black text-slate-900">
                                            {client.full_name ||
                                                `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
                                                'Client sans nom'}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-tight text-slate-400 uppercase">
                                            <Hash className="h-2.5 w-2.5" /> ID-
                                            {client.id}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 group-hover:border-indigo-100">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-sm font-bold text-slate-600">
                                        {client.phone}
                                    </span>
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 text-center group-hover:border-indigo-100">
                                <div
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-widest uppercase',
                                        client.is_registered
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-amber-50 text-amber-600',
                                    )}
                                >
                                    {client.is_registered
                                        ? 'Inscrit'
                                        : 'Temporaire'}
                                </div>
                            </td>
                            <td className="border-y border-slate-100 px-6 py-5 text-right group-hover:border-indigo-100">
                                <span className="text-sm font-black text-slate-700">
                                    {moment(client.created_date).format(
                                        'DD/MM/YYYY',
                                    )}
                                </span>
                            </td>
                            <td className="rounded-r-2xl border-y border-r border-slate-100 px-6 py-5 text-right group-hover:border-indigo-100">
                                <Link href={`/manager/clients/${client.id}`}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-xl border-slate-200 text-xs font-black tracking-widest uppercase hover:border-indigo-500 hover:text-indigo-600"
                                    >
                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                        Détails
                                    </Button>
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
