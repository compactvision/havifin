<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Services\CashService;
use Illuminate\Http\Request;

class CashSessionController extends Controller
{
    protected $cashService;

    public function __construct(CashService $cashService)
    {
        $this->cashService = $cashService;
    }

    public function current(Request $request)
    {
        // Global Shop Session Logic:
        // Find the active session for the authenticated user's shop.
        // We assume the user belongs to a shop.
        $user = $request->user();
        $shopIds = $user->shops()->pluck('shops.id'); 
        
        $query = CashSession::whereHas('register', function ($q) use ($shopIds) {
                $q->whereIn('shop_id', $shopIds);
            })
            ->where('status', 'open')
            ->with(['register.shop', 'amounts', 'workSession']);

        // 1. Prioritize sessions linked to the current active work session of the shop.
        $shopId = $shopIds->first();
        if ($shopId) {
            $workSession = \App\Models\Session::open()->latest('session_date')->where('shop_id', $shopId)->first();
            if ($workSession) {
                $query->orderByRaw('CASE WHEN work_session_id = ? THEN 0 ELSE 1 END', [$workSession->id]);
            }
        }

        // 2. Prioritize the user's OWN session if they are a cashier.
        if ($user->isCashier()) {
            $query->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$user->id]);
        }

        $session = $query->latest()->first();

        if (!$session) {
            return response()->json(['message' => 'No active session found.'], 404);
        }

        return $session->load('workSession');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $shopIds = collect(); // Initialize shopIds as an empty collection

        if ($user->isManager() || $user->isCashier()) {
            $shopIds = $user->shops()->pluck('shops.id');
        } else {
            // Assuming other roles (e.g., Admin) can see all shops
            $shopIds = \App\Models\Shop::pluck('id');
        }
        
        $query = CashSession::whereHas('register', function ($q) use ($shopIds) {
            $q->whereIn('shop_id', $shopIds);
        })->with(['register', 'user', 'amounts']);

        // Default to current active work session if no historical date range provided
        if (!$request->has('date')) {
            $workSession = \App\Models\Session::open()->latest('session_date')->whereIn('shop_id', $shopIds)->first();
            if ($workSession) {
                $query->where('work_session_id', $workSession->id);
            } else {
                // If no active session, maybe show today's anyway?
                $query->whereDate('opened_at', today());
            }
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'opening_amounts' => 'required|array', // ['USD' => 100, 'EUR' => 50]
            'opening_amounts.*' => 'numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $register = CashRegister::with('counter.cashier')->findOrFail($validated['cash_register_id']);
        
        // Determine who the session is for.
        // If the register has a specific cashier assigned via its counter, assign the session to them.
        // Otherwise, fallback to the authenticated user (likely Manager opening their own session or unassigned).
        $user = $register->counter?->cashier ?? $request->user();

        // Link to current active work session for this shop
        $workSession = \App\Models\Session::open()->latest('session_date')->where('shop_id', $register->shop_id)->first();

        try {
            $session = $this->cashService->openSession(
                $user,
                $register,
                $validated['opening_amounts'],
                $validated['notes'] ?? null,
                $workSession?->id
            );
            return response()->json($session, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function close(Request $request, CashSession $session)
    {
        $user = $request->user();
        // Ensure user owns the session, is manager/admin, or is a cashier in the same shop
        $canClose = $user->id === $session->user_id || $user->isManager() || $user->isSuperAdmin();
        
        if (!$canClose) {
            $shopIds = $user->shops()->pluck('shops.id');
            if ($shopIds->contains($session->register->shop_id)) {
                $canClose = true;
            }
        }

        if (!$canClose) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'closing_amounts' => 'required|array',
            'closing_amounts.*' => 'numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            $session = $this->cashService->closeSession(
                $session,
                $validated['closing_amounts'],
                $validated['notes'] ?? null
            );
            return response()->json($session);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function show(CashSession $session)
    {
        // Policy check needed
        return $session->load(['register', 'amounts', 'movements.transaction', 'user', 'workSession']);
    }

    public function report(CashSession $session)
    {
        $movements = $session->movements()->with('transaction.client')->get();

        // 1. Summary by Operation Type (from Transactions)
        // Group movements by the type stored in the movement itself, 
        // but for reporting "Bilan", we'll use the transaction data if available.
        $summary = $movements->groupBy('type')->map(function ($group) {
            return [
                'count' => $group->count(),
                'sum' => $group->sum('amount'),
                'currency' => $group->first()->currency,
            ];
        });

        // 2. Breakdown by Institution (for withdrawals/retraits)
        // We look at transactions linked to these movements
        $institutionBreakdown = $movements->filter(function($m) {
            return $m->transaction_id !== null && strtolower($m->type) === 'withdrawal';
        })->groupBy(function($m) {
            return $m->transaction->service; // Institution name
        })->map(function ($group) {
            return [
                'count' => $group->count(),
                'sum' => abs($group->sum('amount')),
                'currency' => $group->first()->currency,
            ];
        });

        return response()->json([
            'session_id' => $session->id,
            'summary' => $summary,
            'institution_breakdown' => $institutionBreakdown,
            'total_movements' => $movements->count(),
        ]);
    }
}
