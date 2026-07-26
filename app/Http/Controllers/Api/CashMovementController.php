<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Services\CashService;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashMovementController extends Controller
{
    protected $cashService;

    public function __construct(CashService $cashService)
    {
        $this->cashService = $cashService;
    }

    public function index(Request $request, ?CashSession $session = null)
    {
        $query = CashMovement::with(['user', 'session.register.shop']);

        if ($session) {
            TenantAccess::authorizeCashSession($request->user(), $session);
            $query->where('cash_session_id', $session->id);
        } else {
            $user = $request->user();
            $shopIds = TenantAccess::shopIds($user);

            if ($request->has('date')) {
                $query->whereDate('created_at', $request->date);
            }

            if ($request->filled('shop_id')) {
                $shopId = TenantAccess::resolveShopId($user, $request->integer('shop_id'));
                $shopIds = collect([$shopId]);
            }

            $query->whereHas('session.register', function ($q) use ($shopIds) {
                $q->whereIn('shop_id', $shopIds);
            });

            if ($user->isCashier()) {
                $query->whereHas('session', fn ($q) => $q->where('user_id', $user->id));
            }
        }

        return $query->latest()->paginate(50);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cash_session_id' => 'required|exists:cash_sessions,id',
            'type' => 'required|in:adjustment_in,adjustment_out',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|size:3',
            'description' => 'required|string|max:1000',
            'metadata' => 'nullable|array|max:20',
        ]);

        $session = CashSession::findOrFail($validated['cash_session_id']);
        TenantAccess::authorizeShop($request->user(), $session->register->shop_id);
        abort_unless($session->status === 'open', 409, 'Cette caisse est déjà fermée.');

        try {
            $amount = $validated['amount'];
            $type = $validated['type'];
            $validated['currency'] = strtoupper($validated['currency']);

            // Handle signs:
            // adjustment_in, deposit, exchange_in => positive
            // adjustment_out, withdrawal, exchange_out => negative
            $finalAmount = in_array($type, ['withdrawal', 'exchange_out', 'adjustment_out'])
                ? -abs($amount)
                : abs($amount);

            $movement = DB::transaction(function () use ($session, $type, $finalAmount, $validated, $amount) {
                $movement = $this->cashService->recordMovement(
                    $session,
                    $type,
                    $finalAmount,
                    $validated['currency'],
                    $validated['description'],
                    null,
                    $validated['metadata'] ?? []
                );

                CashierActivity::logAction(
                    'cash_adjustment',
                    sprintf(
                        '%s manuelle de %s %s — %s',
                        $type === 'adjustment_in' ? 'Entrée' : 'Sortie',
                        number_format((float) $amount, 2, ',', ' '),
                        $validated['currency'],
                        $validated['description'],
                    ),
                    sessionId: $session->work_session_id,
                );

                return $movement;
            });

            return response()->json($movement, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
