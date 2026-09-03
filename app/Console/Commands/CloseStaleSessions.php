<?php

namespace App\Console\Commands;

use App\Models\CashSession;
use App\Models\Session;
use App\Services\CashService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CloseStaleSessions extends Command
{
    protected $signature = 'sessions:close-stale';

    protected $description = 'Force-close any daily work session (and its open cash sessions) still open past its own day.';

    public function handle(CashService $cashService): int
    {
        $staleSessions = Session::open()
            ->whereDate('session_date', '<', now()->toDateString())
            ->get();

        foreach ($staleSessions as $session) {
            DB::transaction(function () use ($session, $cashService) {
                $session = Session::whereKey($session->id)->lockForUpdate()->firstOrFail();

                if ($session->status !== 'open') {
                    return;
                }

                $openCashSessions = CashSession::where('work_session_id', $session->id)
                    ->where('status', 'open')
                    ->with('amounts', 'register')
                    ->get();

                foreach ($openCashSessions as $cashSession) {
                    $closingAmounts = $cashSession->amounts
                        ->mapWithKeys(fn ($amount) => [
                            $amount->currency => $cashService->getBalance($cashSession->register, $amount->currency),
                        ])
                        ->toArray();

                    $cashService->closeSession(
                        $cashSession,
                        $closingAmounts,
                        'Clôturée automatiquement : la journée a dépassé sa date sans clôture manuelle. Montant théorique repris tel quel, à régulariser si besoin.',
                    );
                }

                $session->update([
                    'status' => 'closed',
                    'closed_at' => now(),
                    'closed_by' => null,
                    'notes' => trim(($session->notes ? $session->notes."\n" : '')
                        .'Clôturée automatiquement le '.now()->toDateTimeString().' (dépassement de journée).'),
                ]);

                Log::warning('Session auto-closed for exceeding its day', [
                    'session_id' => $session->id,
                    'shop_id' => $session->shop_id,
                    'session_date' => $session->session_date->toDateString(),
                    'cash_sessions_force_closed' => $openCashSessions->count(),
                ]);
            });

            $this->info("Session #{$session->id} ({$session->session_date->toDateString()}) clôturée automatiquement.");
        }

        if ($staleSessions->isEmpty()) {
            $this->info('Aucune session en retard.');
        }

        return self::SUCCESS;
    }
}
