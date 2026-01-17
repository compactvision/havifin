<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExchangeRateHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ExchangeRateHistoryController extends Controller
{
    /**
     * Get all exchange rate history.
     */
    public function index(Request $request)
    {
        $query = ExchangeRateHistory::with('creator');

        // Filter by currency pair
        if ($request->has('currency_from') && $request->has('currency_to')) {
            $query->forPair($request->currency_from, $request->currency_to);
        }

        $rates = $query->orderBy('effective_from', 'desc')->get();

        return response()->json($rates);
    }

    /**
     * Get currently active exchange rates.
     */
    public function active()
    {
        $rates = ExchangeRateHistory::active()
            ->with('creator')
            ->get();

        return response()->json($rates);
    }

    /**
     * Create a new exchange rate (and deactivate the previous one).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'currency_from' => 'required|string|size:3',
            'currency_to' => 'required|string|size:3',
            'rate' => 'required|numeric|min:0',
            'effective_from' => 'nullable|date',
            'session_id' => 'nullable|exists:work_sessions,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $effectiveFrom = $request->effective_from ?? now();

            // Deactivate previous rate for this currency pair
            ExchangeRateHistory::forPair($request->currency_from, $request->currency_to)
                ->whereNull('effective_to')
                ->update(['effective_to' => $effectiveFrom]);

            // Create new rate
            $rate = ExchangeRateHistory::create([
                'currency_from' => $request->currency_from,
                'currency_to' => $request->currency_to,
                'rate' => $request->rate,
                'effective_from' => $effectiveFrom,
                'effective_to' => null,
                'created_by' => Auth::id() ?? 1,
                'session_id' => $request->session_id,
            ]);

            DB::commit();

            return response()->json($rate, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Erreur lors de la création du taux',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get the current rate for a specific currency pair.
     */
    public function currentRate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'currency_from' => 'required|string|size:3',
            'currency_to' => 'required|string|size:3',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $rate = ExchangeRateHistory::forPair($request->currency_from, $request->currency_to)
            ->active()
            ->first();

        if (!$rate) {
            return response()->json([
                'error' => 'Aucun taux actif trouvé pour cette paire de devises',
            ], 404);
        }

        return response()->json($rate);
    }
}
