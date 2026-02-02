import { Client } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    Landmark,
    MessageSquareWarning,
    Phone,
    PhoneForwarded,
    RefreshCw,
    Smartphone,
} from 'lucide-react';
import moment from 'moment';
import React from 'react';

interface ClientCardProps {
    client: Client;
    onCall?: (client: Client) => void;
    onRecall?: (client: Client) => void;
    onProcess?: (client: Client) => void;
    onHelp?: (client: Client) => void;
    isProcessing?: boolean;
}

export default function ClientCard({
    client,
    onCall,
    onRecall,
    onProcess,
    onHelp,
    isProcessing,
}: ClientCardProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const isCalled = client.status === 'called';
    const isCompleted = client.status === 'completed';
    const isWaiting = client.status === 'waiting';

    // Auto-expand if called
    React.useEffect(() => {
        if (isCalled) setIsExpanded(true);
    }, [isCalled]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            onClick={() => !isCalled && setIsExpanded(!isExpanded)}
            className={cn(
                'group relative cursor-pointer overflow-hidden transition-all duration-300',
                isCalled
                    ? 'rounded-[2rem] border-blue-500/30 bg-white p-5 shadow-xl ring-1 shadow-blue-500/5 ring-blue-50'
                    : isCompleted
                      ? 'rounded-2xl border-slate-100 bg-slate-50/50 p-3 opacity-60 hover:opacity-100'
                      : 'rounded-2xl border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 hover:shadow-md',
            )}
        >
            {/* Header / Ticket Badge - Compact View */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div
                        className={cn(
                            'flex flex-shrink-0 items-center justify-center font-black tracking-tighter transition-all',
                            isCalled
                                ? 'h-14 w-14 rounded-2xl bg-blue-600 text-xl text-white shadow-lg shadow-blue-500/20'
                                : 'h-10 w-10 rounded-xl bg-slate-900 text-sm text-white',
                        )}
                    >
                        {client.ticket_number}
                    </div>

                    <div className="overflow-hidden">
                        <h4
                            className={cn(
                                'truncate leading-tight font-black tracking-tight text-slate-800',
                                isCalled ? 'text-lg' : 'text-sm',
                            )}
                        >
                            {client.first_name
                                ? `${client.first_name} ${client.last_name || ''}`
                                : client.phone}
                        </h4>
                        {!isCalled && !isExpanded && (
                            <p className="truncate text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                {client.service} •{' '}
                                {moment(client.created_date).format('HH:mm')}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Compact Action - Call Button for waiting */}
                    {isWaiting && !isExpanded && (
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCall?.(client);
                            }}
                            disabled={isProcessing}
                            className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
                        >
                            {isProcessing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Phone className="h-4 w-4" />
                            )}
                        </Button>
                    )}

                    {/* Quick Help/Recall if called */}
                    {isCalled && (
                        <div
                            className="flex gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onHelp?.(client)}
                                className="h-9 w-9 rounded-xl border border-amber-100/50 bg-amber-50 text-amber-600 hover:bg-amber-100"
                            >
                                <MessageSquareWarning className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onRecall?.(client)}
                                className="h-9 w-9 rounded-xl border border-blue-100/50 bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                                <PhoneForwarded className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content / Details section */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className={cn(
                                'mt-4 space-y-3',
                                isCalled
                                    ? ''
                                    : 'border-t border-slate-100 pt-3',
                            )}
                        >
                            {/* Detailed Info */}
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 font-bold text-slate-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {moment(client.created_date).format(
                                        'HH:mm',
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className="h-5 py-0 text-[9px] font-black tracking-tighter uppercase"
                                >
                                    {client.operation_type}
                                </Badge>
                            </div>

                            {/* Service Block */}
                            <div className="flex items-center gap-3 rounded-xl border border-slate-100/50 bg-slate-50 p-3">
                                <div className="rounded-lg bg-white p-1.5 shadow-sm">
                                    {client.operation_type === 'change' ? (
                                        <Landmark className="h-3.5 w-3.5 text-indigo-500" />
                                    ) : (
                                        <Smartphone className="h-3.5 w-3.5 text-amber-500" />
                                    )}
                                </div>
                                <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">
                                    {client.service}
                                </span>
                            </div>

                            {client.amount && (
                                <div className="flex items-center justify-between rounded-xl border border-blue-100/20 bg-blue-50/50 p-3">
                                    <span className="text-[9px] font-black tracking-widest text-blue-600/60 uppercase">
                                        Estimation
                                    </span>
                                    <span className="font-mono text-sm font-black text-blue-700">
                                        {client.amount?.toLocaleString()}{' '}
                                        {client.currency_to}
                                    </span>
                                </div>
                            )}

                            {/* Actions inside expansion */}
                            <div className="pt-2">
                                {isWaiting && (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCall?.(client);
                                        }}
                                        disabled={isProcessing}
                                        className="h-11 w-full rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/20"
                                    >
                                        Appeler Ticket
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                                {isCalled && (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onProcess?.(client);
                                        }}
                                        className="h-12 w-full rounded-xl bg-slate-900 text-sm font-black text-white shadow-xl shadow-slate-900/10"
                                    >
                                        Démarrer le service
                                        <ArrowRight className="ml-2 h-4 w-4 text-[#00e2f6]" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Completed Footer */}
            {isCompleted && !isExpanded && (
                <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-black tracking-widest text-emerald-600 uppercase">
                    <CheckCircle2 className="h-3 w-3" />
                    Terminé
                </div>
            )}

            {/* Background Decor for Called */}
            {isCalled && (
                <div className="absolute -right-6 -bottom-6 h-16 w-16 rounded-full bg-blue-500/5 blur-2xl" />
            )}
        </motion.div>
    );
}
