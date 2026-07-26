<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Session;
use App\Services\CashService;
use App\Support\TenantAccess;
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
        $user = $request->user();
        $shopIds = TenantAccess::shopIds($user);

        $query = CashSession::whereHas('register', function ($q) use ($shopIds) {
            $q->whereIn('shop_id', $shopIds);
        })
            ->where('status', 'open')
            ->with(['register.shop', 'amounts', 'workSession']);

        $workSessionIds = Session::open()
            ->whereIn('shop_id', $shopIds)
            ->pluck('id');

        if ($workSessionIds->isEmpty()) {
            return response('null', 200)
                ->header('Content-Type', 'application/json');
        }

        $query->whereIn('work_session_id', $workSessionIds);

        if ($user->isCashier()) {
            $query->where('user_id', $user->id);
        }

        $session = $query->latest()->first();

        if (! $session) {
            return response('null', 200)
                ->header('Content-Type', 'application/json');
        }

        return $session->load('workSession');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $shopIds = TenantAccess::shopIds($user);

        if ($request->filled('shop_id')) {
            $shopId = TenantAccess::resolveShopId($user, $request->integer('shop_id'));
            $shopIds = collect([$shopId]);
        }

        $query = CashSession::whereHas('register', function ($q) use ($shopIds) {
            $q->whereIn('shop_id', $shopIds);
        })->with(['register', 'user', 'amounts']);

        if ($user->isCashier()) {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('cash_register_id')) {
            $register = CashRegister::findOrFail($request->integer('cash_register_id'));
            TenantAccess::authorizeShop($user, $register->shop_id);
            $query->where('cash_register_id', $register->id);
        }

        // Default to current active work session if no historical date range provided
        if (! $request->has('date')) {
            $workSession = Session::open()->latest('session_date')->whereIn('shop_id', $shopIds)->first();
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
            'opening_amounts' => 'required|array|max:10',
            'opening_amounts.*' => 'numeric|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        $register = CashRegister::with('counter.cashier')->findOrFail($validated['cash_register_id']);
        $actor = $request->user();
        TenantAccess::authorizeShop($actor, $register->shop_id);
        abort_unless($register->is_active, 409, 'Cette caisse est désactivée.');
        abort_if($register->counter && ! $register->counter->is_active, 409, 'Ce guichet est désactivé.');

        if ($actor->isCashier()) {
            abort_unless(
                (int) $register->counter?->cashier_id === $actor->id,
                403,
                'Vous ne pouvez ouvrir que la caisse de votre guichet.',
            );
            $sessionUser = $actor;
        } else {
            $sessionUser = $register->counter?->cashier ?? $actor;
        }
        abort_unless($sessionUser->isActive(), 409, 'Le compte affecté à cette caisse est désactivé.');

        // Link to current active work session for this shop
        $workSession = Session::open()->latest('session_date')->where('shop_id', $register->shop_id)->first();
        abort_unless($workSession, 409, 'La session journalière de la boutique doit être ouverte.');

        try {
            $session = $this->cashService->openSession(
                $sessionUser,
                $register,
                $validated['opening_amounts'],
                $validated['notes'] ?? null,
                $workSession->id
            );

            return response()->json($session, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function close(Request $request, CashSession $session)
    {
        $user = $request->user();
        TenantAccess::authorizeCashSession($user, $session);

        $validated = $request->validate([
            'closing_amounts' => 'required|array|max:10',
            'closing_amounts.*' => 'numeric|min:0',
            'notes' => 'nullable|string|max:2000',
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

    public function show(Request $request, CashSession $session)
    {
        TenantAccess::authorizeCashSession($request->user(), $session);

        return $session->load(['register', 'amounts', 'movements.transaction', 'user', 'workSession']);
    }

    public function report(Request $request, CashSession $session)
    {
        TenantAccess::authorizeCashSession($request->user(), $session);
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
        $institutionBreakdown = $movements->filter(function ($m) {
            return $m->transaction_id !== null && strtolower($m->type) === 'withdrawal';
        })->groupBy(function ($m) {
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
