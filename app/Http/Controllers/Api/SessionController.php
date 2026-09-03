<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\Session;
use App\Models\Shop;
use App\Models\Transaction;
use App\Support\TenantAccess;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SessionController extends Controller
{
    /**
     * Get the current active session.
     */
    public function current(Request $request)
    {
        $user = $request->user();
        $shopId = TenantAccess::resolveShopId($user, $request->query('shop_id'));

        $query = Session::open()
            ->with(['opener', 'closer', 'shop'])
            ->where('shop_id', $shopId)
            ->latest('session_date');

        $session = $query->first();

        if (! $session) {
            return response()->json(null);
        }

        return response()->json($session);
    }

    /**
     * Create a new session for the day.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'session_date' => 'required|date|before_or_equal:today',
            'shop_id' => 'required|exists:shops,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $shopId = $request->shop_id;
        TenantAccess::authorizeShop($user, (int) $shopId);

        try {
            $session = DB::transaction(function () use ($request, $user, $shopId) {
                Shop::whereKey($shopId)->lockForUpdate()->firstOrFail();

                $openSession = Session::open()->where('shop_id', $shopId)->first();
                abort_if($openSession, 409, 'Une session est déjà ouverte pour cette boutique.');

                $existingDate = Session::where('shop_id', $shopId)
                    ->whereDate('session_date', $request->session_date)
                    ->exists();
                abort_if($existingDate, 409, 'Une session existe déjà pour cette date.');

                $session = Session::create([
                    'session_date' => $request->session_date,
                    'opened_by' => $user->id,
                    'opened_at' => now(),
                    'status' => 'open',
                    'notes' => $request->notes,
                    'shop_id' => $shopId,
                ]);

                CashierActivity::logAction(
                    'session_opened',
                    "Session journalière ouverte pour {$session->shop->name}",
                    sessionId: $session->id,
                );

                return $session;
            }, 3);
        } catch (QueryException $e) {
            if ((int) $e->getCode() === 23000) {
                abort(409, 'Une session existe déjà pour cette boutique et cette date.');
            }

            throw $e;
        }

        return response()->json($session, 201);
    }

    /**
     * Close a session.
     */
    public function close(Request $request, $id)
    {
        $session = DB::transaction(function () use ($request, $id) {
            $session = Session::whereKey($id)->lockForUpdate()->firstOrFail();
            TenantAccess::authorizeShop($request->user(), $session->shop_id);
            abort_if($session->status === 'closed', 409, 'Cette session est déjà fermée.');
            abort_if(
                CashSession::where('work_session_id', $session->id)
                    ->where('status', 'open')
                    ->exists(),
                409,
                'Fermez toutes les sessions de caisse avant de clôturer la journée.',
            );

            $session->update([
                'closed_by' => Auth::id(),
                'closed_at' => now(),
                'status' => 'closed',
            ]);

            CashierActivity::logAction(
                'session_closed',
                "Session journalière clôturée pour {$session->shop->name}",
                sessionId: $session->id,
            );

            return $session;
        });

        return response()->json($session);
    }

    /**
     * Re-open a closed session for one of the manager's assigned shops.
     */
    public function reopen(Request $request, $id)
    {
        $session = DB::transaction(function () use ($request, $id) {
            $session = Session::whereKey($id)->lockForUpdate()->firstOrFail();
            TenantAccess::authorizeShop($request->user(), $session->shop_id);
            abort_unless($session->status === 'closed', 409, 'Cette session n’est pas clôturée.');
            abort_unless(
                $session->session_date->isToday(),
                409,
                'Seule une session du jour peut être réouverte.',
            );
            abort_if(
                Session::open()
                    ->where('shop_id', $session->shop_id)
                    ->whereKeyNot($session->id)
                    ->exists(),
                409,
                'Une autre session est déjà ouverte pour cette boutique.',
            );

            $session->update([
                'status' => 'open',
                'closed_at' => null,
                'closed_by' => null,
            ]);

            CashierActivity::logAction(
                'session_reopened',
                "Session journalière réouverte pour {$session->shop->name}",
                sessionId: $session->id,
            );

            return $session;
        });

        return response()->json($session);
    }

    /**
     * Get report for a specific session.
     */
    public function report(Request $request, $id)
    {
        $session = Session::with(['opener', 'closer'])->findOrFail($id);
        TenantAccess::authorizeShop($request->user(), $session->shop_id);

        // Get all clients for this session
        $clients = Client::where('session_id', $id)->get();

        // Get all transactions
        $transactions = Transaction::where('session_id', $id)->get();

        // Get cashier activities
        $activities = CashierActivity::where('session_id', $id)
            ->with('cashier')
            ->get();

        // Calculate statistics
        $stats = [
            'total_clients' => $clients->count(),
            'completed_clients' => $clients->where('status', 'completed')->count(),
            'waiting_clients' => $clients->where('status', 'waiting')->count(),
            'called_clients' => $clients->where('status', 'called')->count(),
            'total_transactions' => $transactions->count(),
            'volume_usd' => $transactions->where('currency_from', 'USD')->sum('amount_from'),
            'volume_cdf' => $transactions->where('currency_from', 'CDF')->sum('amount_from'),
            'commissions' => $transactions->sum('commission'),
            'cashier_stats' => $activities->groupBy('cashier_id')->map(function ($group) {
                return [
                    'cashier' => $group->first()->cashier->name ?? 'Unknown',
                    'total_activities' => $group->count(),
                    'clients_called' => $group->where('activity_type', 'call_client')->count(),
                    'transactions_completed' => $group->where('activity_type', 'complete_transaction')->count(),
                ];
            })->values(),
        ];

        return response()->json([
            'session' => $session,
            'statistics' => $stats,
            'clients' => $clients,
            'transactions' => $transactions,
            'activities' => $activities,
        ]);
    }

    /**
     * List all sessions.
     */
    public function index(Request $request)
    {
        $allowedShopIds = TenantAccess::shopIds($request->user());
        $query = Session::with(['opener', 'closer', 'shop', 'events'])
            // How many tills are actually manned right now, against how many
            // cashiers the shop has assigned to a counter.
            ->withCount([
                'cashSessions as open_cash_sessions_count' => fn ($q) => $q->where('status', 'open'),
            ])
            ->whereIn('shop_id', $allowedShopIds);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('shop_id')) {
            TenantAccess::authorizeShop($request->user(), (int) $request->shop_id);
            $query->where('shop_id', $request->shop_id);
        }

        if ($request->has('date')) {
            $query->whereDate('session_date', $request->date);
        }

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $sessions = $query->orderBy('session_date', 'desc')->paginate($perPage);

        return response()->json($sessions);
    }
}
