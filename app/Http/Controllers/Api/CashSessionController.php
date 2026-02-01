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
        // Get active session for the authenticated user
        // They might have multiple if system allows (unlikely for cashier), but usually one.
        // Or get session for a specific register if passed.
        $session = CashSession::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->with(['register', 'amounts'])
            ->latest()
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No active session found.'], 404);
        }

        return $session;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'opening_amounts' => 'required|array', // ['USD' => 100, 'EUR' => 50]
            'opening_amounts.*' => 'numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $register = CashRegister::findOrFail($validated['cash_register_id']);
        
        // Authorization check: User must be able to access this register (e.g. assigned to counter)
        // For now, assuming if they can see it, they can open it, or add Policy check later.

        try {
            $session = $this->cashService->openSession(
                $request->user(),
                $register,
                $validated['opening_amounts'],
                $validated['notes'] ?? null
            );
            return response()->json($session, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function close(Request $request, CashSession $session)
    {
        // Ensure user owns the session or is manager
        if ($request->user()->id !== $session->user_id && !$request->user()->isManager()) {
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
        return $session->load(['register', 'amounts', 'movements', 'user', 'workSession']);
    }
}
