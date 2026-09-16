import { base44 } from '@/api/base44Client';
import { Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';

const numberFmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Surfaces every operator float currently below its configured floor,
 * across all open tills the current user can see - the live counterpart
 * to the low_balance_alert entries in the activity log, so a manager
 * catches a depleted float without having to open each session.
 */
export default function LowBalanceAlertsBanner() {
    const { data: alerts = [] } = useQuery({
        queryKey: ['low-balance-alerts'],
        queryFn: () => base44.entities.Institution.lowBalanceAlerts(),
        refetchInterval: 30000,
    });

    if (alerts.length === 0) return null;

    return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-sm font-bold tracking-wide text-red-700 uppercase">
                    {alerts.length} seuil
                    {alerts.length > 1 ? 's' : ''} critique
                    {alerts.length > 1 ? 's' : ''} atteint
                    {alerts.length > 1 ? 's' : ''}
                </h3>
            </div>
            <div className="space-y-2">
                {alerts.map((alert) => (
                    <Link
                        key={alert.id}
                        href={`/cash/sessions/${alert.cash_session_id}`}
                        className="flex items-center justify-between rounded-2xl border border-red-100 bg-white p-3 text-sm transition-colors hover:border-red-300"
                    >
                        <div>
                            <span className="font-bold text-slate-800">
                                {alert.institution}
                            </span>
                            {alert.shop && (
                                <span className="text-slate-400">
                                    {' '}
                                    · {alert.shop}
                                </span>
                            )}
                            {alert.cashier && (
                                <span className="text-slate-400">
                                    {' '}
                                    · {alert.cashier}
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-red-600">
                                {numberFmt.format(alert.current_theoretical)}{' '}
                                {alert.currency}
                            </span>
                            <span className="ml-2 text-xs text-slate-400">
                                (seuil {numberFmt.format(alert.threshold)}{' '}
                                {alert.currency})
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
