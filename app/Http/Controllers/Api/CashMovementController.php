<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Models\CashierActivity;
use App\Services\CashService;
use Illuminate\Http\Request;

class CashMovementController extends Controller
{
    protected $cashService;

    public function __construct(CashService $cashService)
    {
        $this->cashService = $cashService;
    }

    public function index(Request $request, CashSession $session = null)
    {
        $query = \App\Models\CashMovement::with(['user', 'session.register.shop']);

        if ($session) {
            $query->where('cash_session_id', $session->id);
        } else {
            // Global search for managers/admins
            $user = $request->user();
            $shopIds = $user->shops()->pluck('shops.id');

            if ($request->has('date')) {
                $query->whereDate('created_at', $request->date);
            }

            if ($shopIds->isNotEmpty() && !$request->has('all_shops')) {
                $query->whereHas('session.register', function ($q) use ($shopIds) {
                    $q->whereIn('shop_id', $shopIds);
                });
            }
        }

        return $query->latest()->paginate(50);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cash_session_id' => 'required|exists:cash_sessions,id',
            'type' => 'required|string', // adjustment_in, adjustment_out, deposit, withdrawal
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'description' => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        $session = CashSession::findOrFail($validated['cash_session_id']);

        try {
            $amount = $validated['amount'];
            $type = $validated['type'];

            // Handle signs:
            // adjustment_in, deposit, exchange_in => positive
            // adjustment_out, withdrawal, exchange_out => negative
            $finalAmount = in_array($type, ['withdrawal', 'exchange_out', 'adjustment_out']) 
                ? -abs($amount) 
                : abs($amount);

            $movement = $this->cashService->recordMovement(
                $session,
                $type,
                $finalAmount,
                $validated['currency'],
                $validated['description'],
                null,
                $validated['metadata'] ?? []
            );

            return response()->json($movement, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
