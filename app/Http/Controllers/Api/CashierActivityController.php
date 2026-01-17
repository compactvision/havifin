<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CashierActivityController extends Controller
{
    /**
     * Get all cashier activities with filters.
     */
    public function index(Request $request)
    {
        $query = CashierActivity::with(['cashier', 'session', 'client']);

        // Filter by cashier
        if ($request->has('cashier_id')) {
            $query->forCashier($request->cashier_id);
        }

        // Filter by session
        if ($request->has('session_id')) {
            $query->forSession($request->session_id);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $activities = $query->orderBy('created_at', 'desc')->get();

        return response()->json($activities);
    }

    /**
     * Store a new cashier activity.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cashier_id' => 'nullable|exists:users,id',
            'session_id' => 'nullable|exists:work_sessions,id',
            'activity_type' => 'required|in:login,logout,call_client,complete_transaction,help_request,recall_client',
            'client_id' => 'nullable|exists:clients,id',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $activity = CashierActivity::create([
            'cashier_id' => $request->cashier_id ?? Auth::id(),
            'session_id' => $request->session_id,
            'activity_type' => $request->activity_type,
            'client_id' => $request->client_id,
            'description' => $request->description,
            'created_at' => now(),
        ]);

        return response()->json($activity, 201);
    }

    /**
     * Get statistics for cashiers.
     */
    public function stats(Request $request)
    {
        $query = CashierActivity::with('cashier');

        // Filter by session if provided
        if ($request->has('session_id')) {
            $query->forSession($request->session_id);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $activities = $query->get();

        // Group by cashier and calculate stats
        $stats = $activities->groupBy('cashier_id')->map(function ($group) {
            $cashier = $group->first()->cashier;
            return [
                'cashier_id' => $cashier->id ?? null,
                'cashier_name' => $cashier->name ?? 'Unknown',
                'total_activities' => $group->count(),
                'logins' => $group->where('activity_type', 'login')->count(),
                'logouts' => $group->where('activity_type', 'logout')->count(),
                'clients_called' => $group->where('activity_type', 'call_client')->count(),
                'clients_recalled' => $group->where('activity_type', 'recall_client')->count(),
                'transactions_completed' => $group->where('activity_type', 'complete_transaction')->count(),
                'help_requests' => $group->where('activity_type', 'help_request')->count(),
            ];
        })->values();

        return response()->json($stats);
    }
}
