<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Session;
use App\Models\CashierActivity;
use App\Models\Client;
use App\Models\Transaction;
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
        $shopId = $request->query('shop_id');

        if (!$shopId && $user && ($user->role === 'cashier' || $user->role === 'client')) {
            $shopId = $user->shops()->first()?->id;
        }

        $query = Session::open()
            ->with(['opener', 'closer'])
            ->latest('session_date');

        if ($shopId) {
            $query->where('shop_id', $shopId);
        }

        $session = $query->first();

        if (!$session) {
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
            'session_date' => 'required|date',
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

        // Check if there's already an open session for THIS shop
        $openSession = Session::open()->where('shop_id', $shopId)->first();
        if ($openSession) {
            return response()->json([
                'error' => 'Une session est déjà ouverte pour cette boutique',
                'session' => $openSession,
            ], 409);
        }

        // Check if session date already exists for THIS shop (Business Rule: 1 session per day)
        $existingDate = Session::where('shop_id', $shopId)
            ->whereDate('session_date', $request->session_date)
            ->first();
        if ($existingDate) {
            return response()->json([
                'error' => 'Une session existe déjà pour cette date dans cette boutique. Veuillez plutôt gérer la session existante.',
            ], 409);
        }

        $sessionData = [
            'session_date' => $request->session_date,
            'opened_by' => $user->id,
            'opened_at' => now(),
            'status' => 'open',
            'notes' => $request->notes,
            'shop_id' => $shopId,
        ];

        $session = Session::create($sessionData);

        return response()->json($session, 201);
    }

    /**
     * Close a session.
     */
    public function close(Request $request, $id)
    {
        $session = Session::findOrFail($id);

        if ($session->status === 'closed') {
            return response()->json([
                'error' => 'Cette session est déjà fermée',
            ], 400);
        }

        $session->update([
            'closed_by' => Auth::id() ?? 1,
            'closed_at' => now(),
            'status' => 'closed',
        ]);

        return response()->json($session);
    }

    /**
     * Re-open a closed session (Super-Admin only).
     */
    public function reopen(Request $request, $id)
    {
        $user = $request->user();

        // 1. Role Check
        if ($user->role !== 'super-admin') {
            return response()->json([
                'error' => 'Seul le Super-Admin peut réouvrir une session clôturée.',
            ], 403);
        }

        $session = Session::findOrFail($id);

        // 2. Status Check
        if ($session->status !== 'closed') {
            return response()->json([
                'error' => 'Cette session n\'est pas clôturée.',
            ], 400);
        }

        // 3. Concurrency Check: Ensure no other session is open for this shop
        $openSession = Session::open()->where('shop_id', $session->shop_id)->first();
        if ($openSession) {
            return response()->json([
                'error' => 'Une autre session est déjà ouverte pour cette agence. Vous devez la fermer avant de réouvrir celle-ci.',
                'open_session' => $openSession,
            ], 409);
        }

        // 4. Re-open
        $session->update([
            'status' => 'open',
            'closed_at' => null,
            'closed_by' => null,
        ]);

        return response()->json($session);
    }

    /**
     * Get report for a specific session.
     */
    public function report($id)
    {
        $session = Session::with(['opener', 'closer'])->findOrFail($id);

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
        $query = Session::with(['opener', 'closer', 'shop']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }
        
        if ($request->has('date')) {
            $query->whereDate('session_date', $request->date);
        }

        $perPage = $request->query('per_page', 15);
        $sessions = $query->orderBy('session_date', 'desc')->paginate($perPage);

        return response()->json($sessions);
    }
}
