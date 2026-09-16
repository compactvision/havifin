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
                    ->with(['amounts', 'institutionBalances', 'register'])
                    ->get();

                $forceNote = 'Clôturée automatiquement : la journée a dépassé sa date sans clôture manuelle. Montant réel non compté — à régulariser.';

                foreach ($openCashSessions as $cashSession) {
                    $cashService->forceCloseSession($cashSession, $forceNote);
                }

                $session->update([
                    'status' => 'closed',
                    'force_closed' => true,
                    'closed_at' => now(),
                    'closed_by' => null,
                    'notes' => trim(($session->notes ? $session->notes."\n" : '')
                        .'Clôturée automatiquement le '.now()->toDateTimeString().' (dépassement de journée, force_closed).'),
                ]);

                Log::warning('Session auto-closed for exceeding its day', [
                    'session_id' => $session->id,
                    'shop_id' => $session->shop_id,
                    'session_date' => $session->session_date->toDateString(),
                    'cash_sessions_force_closed' => $openCashSessions->count(),
                    'force_closed' => true,
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
