import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Banknote, Clock, Phone } from 'lucide-react';
import moment from 'moment';

const serviceNames = {
    mpesa: 'M-Pesa',
    orange_money: 'Orange Money',
    airtel_money: 'Airtel Money',
    afrimoney: 'Afrimoney',
    rawbank: 'Rawbank',
    equity_bcdc: 'Equity BCDC',
    tmb: 'TMB',
    fbn_bank: 'FBN Bank',
};

const serviceColors = {
    mpesa: 'bg-green-100 text-green-700',
    orange_money: 'bg-orange-100 text-orange-700',
    airtel_money: 'bg-red-100 text-red-700',
    afrimoney: 'bg-blue-100 text-blue-700',
    rawbank: 'bg-blue-100 text-blue-700',
    equity_bcdc: 'bg-purple-100 text-purple-700',
    tmb: 'bg-teal-100 text-teal-700',
    fbn_bank: 'bg-indigo-100 text-indigo-700',
};

const operationLabels = {
    change: 'Change',
    depot: 'Dépôt',
    retrait: 'Retrait',
};

export default function ClientCard({
    client,
    onCall,
    onProcess,
    isProcessing,
}) {
    const waitTime = moment().diff(moment(client.created_date), 'minutes');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg"
        >
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="font-mono text-2xl font-black text-amber-500">
                        {client.ticket_number}
                    </div>
                    <Badge className={serviceColors[client.service]}>
                        {serviceNames[client.service]}
                    </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>{waitTime} min</span>
                </div>
            </div>

            <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span className="font-semibold">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Banknote className="h-4 w-4" />
                    <span>{operationLabels[client.operation_type]}</span>
                    {client.amount && (
                        <span className="font-medium text-slate-700">
                            - {client.amount} {client.currency_from}
                        </span>
                    )}
                    {client.currency_from &&
                        client.currency_to &&
                        client.operation_type === 'change' && (
                            <>
                                <ArrowRight className="h-3 w-3" />
                                <span>{client.currency_to}</span>
                            </>
                        )}
                </div>
            </div>

            <div className="flex gap-2">
                {client.status === 'waiting' && onCall && (
                    <Button
                        onClick={() => onCall(client)}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                    >
                        Appeler
                    </Button>
                )}
                {client.status === 'called' && onProcess && (
                    <Button
                        onClick={() => onProcess(client)}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl bg-green-500 text-white hover:bg-green-600"
                    >
                        Traiter
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
