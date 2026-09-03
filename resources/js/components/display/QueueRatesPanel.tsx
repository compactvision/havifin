import { base44, Client } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightLeft, ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QueueRatesPanelProps {
    waitingClients: Client[];
    isDarkMode?: boolean;
}

const SLIDE_DURATION_MS = 10000;

/**
 * Alternates the display's side panel between the day's exchange rates (as set
 * by the manager) and the waiting queue, so the screen stays useful even when
 * nobody is queued.
 */
export default function QueueRatesPanel({
    waitingClients,
    isDarkMode = false,
}: QueueRatesPanelProps) {
    // Show the operative rates (ExchangeRate), the ones cashiers actually
    // apply, so the public screen cannot advertise a different figure.
    const { data: rates = [] } = useQuery({
        queryKey: ['exchange-rates'],
        queryFn: () => base44.entities.ExchangeRate.getAll(),
        refetchInterval: 30000,
    });

    const slides = rates.length > 0 ? ['rates', 'queue'] : ['queue'];
    const [index, setIndex] = useState(0);

    // Rates may load after mount, or be removed by the manager: clamp so the
    // index never points past the end of the list.
    const activeSlide = slides[index % slides.length];

    useEffect(() => {
        if (slides.length < 2) return;
        const timer = setInterval(
            () => setIndex((i) => i + 1),
            SLIDE_DURATION_MS,
        );
        return () => clearInterval(timer);
    }, [slides.length]);

    const headerText =
        activeSlide === 'rates'
            ? 'Taux du Jour'
            : `En Attente (${waitingClients.length})`;

    return (
        <div
            className={cn(
                'flex flex-1 flex-col overflow-hidden rounded-[2.5rem] border',
                isDarkMode
                    ? 'border-white/10 bg-brand-dark/60 backdrop-blur-xl'
                    : 'border-slate-200 bg-white/60 backdrop-blur-xl',
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-between gap-3 border-b px-6 py-4',
                    isDarkMode ? 'border-white/5' : 'border-slate-100',
                )}
            >
                <div className="flex items-center gap-3">
                    {activeSlide === 'rates' ? (
                        <ArrowRightLeft
                            className={cn(
                                'h-5 w-5',
                                isDarkMode
                                    ? 'text-brand-cyan'
                                    : 'text-brand-blue',
                            )}
                        />
                    ) : (
                        <Users
                            className={cn(
                                'h-5 w-5',
                                isDarkMode
                                    ? 'text-slate-400'
                                    : 'text-slate-500',
                            )}
                        />
                    )}
                    <span
                        className={cn(
                            'text-xs font-bold tracking-[0.2em] uppercase',
                            isDarkMode ? 'text-slate-400' : 'text-slate-500',
                        )}
                    >
                        {headerText}
                    </span>
                </div>

                {slides.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        {slides.map((slide, i) => (
                            <span
                                key={slide}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-500',
                                    slide === activeSlide
                                        ? 'w-5 bg-brand-blue'
                                        : 'w-1.5 bg-slate-300',
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="relative flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSlide}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 scrollbar-none space-y-3 overflow-y-auto p-4"
                    >
                        {activeSlide === 'rates'
                            ? rates.map((rate: any) => (
                                  <div
                                      key={rate.id}
                                      className={cn(
                                          'flex items-center justify-between rounded-2xl border p-4',
                                          isDarkMode
                                              ? 'border-white/5 bg-white/5'
                                              : 'border-slate-100 bg-white shadow-sm',
                                      )}
                                  >
                                      <div className="flex items-center gap-2">
                                          <span
                                              className={cn(
                                                  'text-lg font-bold',
                                                  isDarkMode
                                                      ? 'text-white'
                                                      : 'text-slate-800',
                                              )}
                                          >
                                              {rate.currency_from}
                                          </span>
                                          <ArrowRightLeft
                                              className={cn(
                                                  'h-4 w-4',
                                                  isDarkMode
                                                      ? 'text-brand-cyan'
                                                      : 'text-brand-blue',
                                              )}
                                          />
                                          <span
                                              className={cn(
                                                  'text-lg font-bold',
                                                  isDarkMode
                                                      ? 'text-brand-cyan'
                                                      : 'text-brand-blue',
                                              )}
                                          >
                                              {rate.currency_to}
                                          </span>
                                      </div>
                                      <span
                                          className={cn(
                                              'font-mono text-2xl font-bold tabular-nums',
                                              isDarkMode
                                                  ? 'text-white'
                                                  : 'text-slate-900',
                                          )}
                                      >
                                          {Number(rate.rate).toLocaleString(
                                              'fr-FR',
                                              {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                              },
                                          )}
                                      </span>
                                  </div>
                              ))
                            : waitingClients.slice(0, 5).map((client) => (
                                  <div
                                      key={client.id}
                                      className={cn(
                                          'flex items-center justify-between rounded-2xl border p-3',
                                          isDarkMode
                                              ? 'border-white/5 bg-white/5'
                                              : 'border-slate-100 bg-white shadow-sm',
                                      )}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div
                                              className={cn(
                                                  'flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold',
                                                  isDarkMode
                                                      ? 'bg-slate-800 text-blue-400'
                                                      : 'bg-blue-50 text-blue-600',
                                              )}
                                          >
                                              {client.ticket_number}
                                          </div>
                                          <span
                                              className={cn(
                                                  'text-[10px] font-semibold tracking-wider uppercase',
                                                  isDarkMode
                                                      ? 'text-slate-500'
                                                      : 'text-slate-400',
                                              )}
                                          >
                                              Ticket
                                          </span>
                                      </div>
                                      <div
                                          className={cn(
                                              'flex items-center gap-1 text-xs font-semibold uppercase',
                                              isDarkMode
                                                  ? 'text-slate-400'
                                                  : 'text-slate-500',
                                          )}
                                      >
                                          <ChevronRight className="h-3 w-3" />
                                          {client.service}
                                      </div>
                                  </div>
                              ))}

                        {activeSlide === 'queue' &&
                            waitingClients.length === 0 && (
                                <div className="flex h-full items-center justify-center opacity-30">
                                    <span className="text-xs font-bold tracking-widest uppercase">
                                        Aucune attente
                                    </span>
                                </div>
                            )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
