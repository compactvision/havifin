import { base44, BccRateEntry } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FlagIcon } from '@/components/ui/flag-icon';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Landmark, Loader2, RefreshCw } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';

const numberFmt = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
});

export default function BccRatesBoard() {
    const queryClient = useQueryClient();

    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: ['bcc-rates'],
        queryFn: () => base44.entities.BccRate.fetch(),
        staleTime: 5 * 60 * 1000,
    });

    const refreshMutation = useMutation({
        mutationFn: () => base44.entities.BccRate.fetch(true),
        onSuccess: (fresh) => {
            queryClient.setQueryData(['bcc-rates'], fresh);
            toast.success('Taux BCC actualisés');
        },
        onError: () => toast.error("Impossible d'actualiser les taux BCC"),
    });

    const applyMutation = useMutation({
        mutationFn: (code: string) => base44.entities.BccRate.apply(code),
        onSuccess: (_result, code) => {
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            toast.success(`Taux ${code}/CDF appliqué à votre boutique`);
        },
        onError: (err: any, code) => {
            toast.error(
                err?.response?.data?.message ??
                    `Échec de l'application du taux ${code}`,
            );
        },
    });

    const rates = (data?.rates ?? []).filter(
        (r) => r.code && r.code.toUpperCase() !== 'CDF',
    );

    return (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
                        <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">
                            Taux de référence — Banque Centrale du Congo
                        </h3>
                        <p className="text-xs text-slate-500">
                            Pour comparaison uniquement — appliquez un taux
                            pour l'utiliser dans votre boutique.
                            {data?.asOfDate && (
                                <>
                                    {' '}
                                    Publié le{' '}
                                    {moment(data.asOfDate).format(
                                        'DD/MM/YYYY',
                                    )}
                                    .
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                    className="rounded-xl"
                >
                    {refreshMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Synchroniser
                </Button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Impossible de récupérer les taux de la BCC pour le
                    moment.
                </div>
            )}

            {!isLoading && !error && rates.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Aucun taux disponible.
                </div>
            )}

            {!isLoading && rates.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence initial={false}>
                        {rates.map((rate: BccRateEntry) => (
                            <motion.div
                                key={rate.code}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FlagIcon
                                            currency={rate.code}
                                            className="h-6 w-8 text-lg shadow-sm"
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {rate.code}/CDF
                                            </p>
                                            {rate.name && (
                                                <p className="text-[11px] text-slate-500">
                                                    {rate.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {rate.quality && rate.quality !== 'OK' && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                            Douteux
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded-xl bg-white px-3 py-2">
                                        <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                                            Achat
                                        </p>
                                        <p className="font-semibold tabular-nums text-slate-900">
                                            {numberFmt.format(rate.buy)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-2">
                                        <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                                            Vente
                                        </p>
                                        <p className="font-semibold tabular-nums text-slate-900">
                                            {numberFmt.format(rate.sell)}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={
                                        applyMutation.isPending ||
                                        Boolean(
                                            rate.quality &&
                                                rate.quality !== 'OK',
                                        )
                                    }
                                    onClick={() =>
                                        applyMutation.mutate(rate.code)
                                    }
                                    className={cn(
                                        'mt-1 rounded-xl',
                                        applyMutation.variables ===
                                            rate.code &&
                                            applyMutation.isSuccess &&
                                            'bg-emerald-100 text-emerald-700',
                                    )}
                                >
                                    {applyMutation.isPending &&
                                    applyMutation.variables === rate.code ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : applyMutation.variables ===
                                          rate.code &&
                                      applyMutation.isSuccess ? (
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                    ) : null}
                                    Appliquer ce taux
                                </Button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {data?.fetchedAt && (
                <p className="mt-4 text-right text-[11px] text-slate-400">
                    {isFetching
                        ? 'Actualisation…'
                        : `Récupéré à ${moment(data.fetchedAt).format('HH:mm:ss')}`}
                </p>
            )}
        </div>
    );
}
