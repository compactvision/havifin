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

        // Filter by date range or default to current active session
        if (!$request->has('session_id') && !$request->has('start_date') && !$request->has('end_date')) {
            $user = $request->user();
            $shopIds = $user->shops()->pluck('shops.id');
            
            if ($shopIds->isNotEmpty()) {
                $activeSession = \App\Models\Session::open()->whereIn('shop_id', $shopIds)->first();
                if ($activeSession) {
                    $query->where('session_id', $activeSession->id);
                } else {
                    $query->whereDate('created_at', today());
                }
            } else {
                 $query->whereDate('created_at', today());
            }
        }

        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }

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

        // Default to current active session if no filters
        if (!$request->has('session_id') && !$request->has('start_date') && !$request->has('end_date')) {
            $user = $request->user();
            $shopIds = $user->shops()->pluck('shops.id');
            $activeSession = \App\Models\Session::open()->whereIn('shop_id', $shopIds)->first();
            if ($activeSession) {
                $query->where('session_id', $activeSession->id);
            } else {
                $query->whereDate('created_at', today());
            }
        }

        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }

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
            
            // Get all movement related activities for this user today
            $movements = \App\Models\CashMovement::where('user_id', $cashier->id)
                ->whereDate('created_at', today())
                ->get();

            $firstLogin = $group->where('activity_type', 'login')->first();

            return [
                'cashier_id' => $cashier->id ?? null,
                'cashier_name' => $cashier->name ?? 'Unknown',
                'cashier_email' => $cashier->email ?? '',
                'total_activities' => $group->count(),
                'connection_time' => $firstLogin ? $firstLogin->created_at->format('H:i') : null,
                'logins' => $group->where('activity_type', 'login')->count(),
                'logouts' => $group->where('activity_type', 'logout')->count(),
                'clients_called' => $group->where('activity_type', 'call_client')->count(),
                'transactions_completed' => $group->where('activity_type', 'complete_transaction')->count(),
                'help_requests' => $group->where('activity_type', 'help_request')->count(),
                
                // Detailed Movement breakdown (today)
                'detailed_stats' => [
                    'deposits' => $movements->where('type', 'deposit')->count(),
                    'withdrawals' => $movements->where('type', 'withdrawal')->count(),
                    'exchanges' => $movements->whereIn('type', ['exchange_in', 'exchange_out'])->count() / 2, // Pairs
                    'adjustments_in' => $movements->where('type', 'adjustment_in')->count(),
                    'adjustments_out' => $movements->where('type', 'adjustment_out')->count(),
                    'total_amount_usd' => $movements->where('currency', 'USD')->sum('amount'),
                    'total_amount_cdf' => $movements->where('currency', 'CDF')->sum('amount'),
                ],
                'recent_activities' => $group->take(20)->map(function($act) {
                    return [
                        'id' => $act->id,
                        'type' => $act->activity_type,
                        'description' => $act->description,
                        'time' => $act->created_at->format('H:i'),
                    ];
                })
            ];
        })->values();

        return response()->json($stats);
    }
}
