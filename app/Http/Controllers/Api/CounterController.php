<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Counter;
use App\Models\Shop;
use Illuminate\Http\Request;

class CounterController extends Controller
{
    /**
     * Display a listing of counters for a shop.
     */
    public function index($shopId)
    {
        $shop = Shop::findOrFail($shopId);
        
        $counters = Counter::where('shop_id', $shopId)
            ->with('cashier:id,name,email')
            ->orderBy('counter_number')
            ->get();

        return response()->json($counters);
    }

    /**
     * Store a newly created counter.
     */
    public function store(Request $request, $shopId)
    {
        $shop = Shop::findOrFail($shopId);
        
        $validated = $request->validate([
            'counter_number' => 'required|integer|min:1',
            'name' => 'required|string|max:255',
            'cashier_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        // Check if counter_number already exists for this shop
        $exists = Counter::where('shop_id', $shopId)
            ->where('counter_number', $validated['counter_number'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Ce numéro de guichet existe déjà pour cette boutique.'
            ], 422);
        }

        $counter = Counter::create([
            'shop_id' => $shopId,
            ...$validated,
        ]);

        return response()->json($counter->load('cashier'), 201);
    }

    /**
     * Update the specified counter.
     */
    public function update(Request $request, $id)
    {
        $counter = Counter::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'cashier_id' => 'nullable', // Removed exists check temporarily to debug, will handle manually
            'is_active' => 'sometimes|boolean',
        ]);

        // Specific handling for cashier_id to allow unassignment (null)
        if ($request->has('cashier_id')) {
            $counter->cashier_id = $validation['cashier_id'] ?? $request->cashier_id;
        }

        if ($request->has('name')) {
            $counter->name = $validated['name'];
        }

        if ($request->has('is_active')) {
            $counter->is_active = $validated['is_active'];
        }

        $counter->save();

        return response()->json($counter->load('cashier'));
    }

    /**
     * Remove the specified counter.
     */
    public function destroy($id)
    {
        $counter = Counter::findOrFail($id);
        $counter->delete();

        return response()->json(['message' => 'Guichet supprimé avec succès']);
    }
}
