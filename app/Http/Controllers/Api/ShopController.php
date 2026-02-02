<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShopController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return Shop::with('users')->get();
        }
        return $user->shops()->with('users')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'counter_count' => 'integer|min:1',
            'is_active' => 'boolean',
            'user_ids' => 'array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        
        // Assign owner_id
        $creator = $request->user();
        $validated['owner_id'] = $creator->role === 'super-admin' ? $creator->id : $creator->owner_id;

        $shop = Shop::create($validated);

        if (isset($validated['user_ids'])) {
            $shop->users()->sync($validated['user_ids']);
        }

        \App\Models\CashierActivity::logAction('complete_transaction', "Boutique créée: {$shop->name}");

        return response()->json($shop->load('users'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Shop $shop)
    {
        return $shop->load('users');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Shop $shop)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$user->shops->contains($shop->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:255',
            'counter_count' => 'integer|min:1',
            'is_active' => 'boolean',
            'user_ids' => 'array',
            'user_ids.*' => 'exists:users,id',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $shop->update($validated);

        if (isset($validated['user_ids'])) {
            $shop->users()->sync($validated['user_ids']);
        }

        \App\Models\CashierActivity::logAction('complete_transaction', "Boutique mise à jour: {$shop->name}");

        return response()->json($shop->load('users'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Shop $shop)
    {
        if (!request()->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $shop->delete();
        return response()->json(null, 204);
    }

    /**
     * Assign users to a shop.
     */
    public function assignUsers(Request $request, Shop $shop)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin() && !$user->shops->contains($shop->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $shop->users()->sync($validated['user_ids']);

        return response()->json($shop->load('users'));
    }
}
