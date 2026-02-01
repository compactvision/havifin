<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Services\CashService;
use Illuminate\Http\Request;

class CashMovementController extends Controller
{
    protected $cashService;

    public function __construct(CashService $cashService)
    {
        $this->cashService = $cashService;
    }

    public function index(Request $request, CashSession $session)
    {
        // Auth check...
        return $session->movements()->latest()->paginate(50);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cash_session_id' => 'required|exists:cash_sessions,id',
            'type' => 'required|string', // adjustment_in, adjustment_out
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'description' => 'required|string',
        ]);

        $session = CashSession::findOrFail($validated['cash_session_id']);

        // Check auth to perform movement on this session
        
        try {
            $movement = $this->cashService->recordMovement(
                $session,
                $validated['type'],
                $validated['amount'], // Service handles sign? No, requirement said "Logic: In is +, Out is -".
                // Adjustment In is +, Adjustment Out is -
                // Currently service adds amount. So for Out we should probably pass negative or handle it.
                // Let's assume for now we pass positive and service adds it, so for adjustment_out we should negate it?
                // Step 97 service code: "$balance->amount += $amount;"
                // So yes, I must pass negative for withdrawals.
                in_array($validated['type'], ['withdrawal', 'exchange_out', 'adjustment_out']) ? -$validated['amount'] : $validated['amount'],
                $validated['currency'],
                $validated['description']
            );
            return response()->json($movement, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
