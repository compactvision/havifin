<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Session;
use App\Models\CashierActivity;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SessionController extends Controller
{
    /**
     * Get the current active session.
     */
    public function current()
    {
        $session = Session::open()
            ->with(['opener', 'closer'])
            ->latest('session_date')
            ->first();

        if (!$session) {
            return response()->json([
                'session' => null,
                'message' => 'Aucune session active',
            ]);
        }

        return response()->json($session);
    }

    /**
     * Create a new session for the day.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'session_date' => 'required|date|unique:work_sessions,session_date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        // Check if there's already an open session
        $openSession = Session::open()->first();
        if ($openSession) {
            return response()->json([
                'error' => 'Une session est déjà ouverte',
                'session' => $openSession,
            ], 409);
        }

        $session = Session::create([
            'session_date' => $request->session_date,
            'opened_by' => Auth::id() ?? 1, // Fallback to user 1 if not authenticated
            'opened_at' => now(),
            'status' => 'open',
            'notes' => $request->notes,
        ]);

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
     * Get report for a specific session.
     */
    public function report($id)
    {
        $session = Session::with(['opener', 'closer'])->findOrFail($id);

        // Get all clients for this session (by date)
        $clients = Client::whereDate('created_at', $session->session_date)->get();

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
            'activities' => $activities,
        ]);
    }

    /**
     * List all sessions.
     */
    public function index(Request $request)
    {
        $query = Session::with(['opener', 'closer']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $sessions = $query->orderBy('session_date', 'desc')->get();

        return response()->json($sessions);
    }
}
