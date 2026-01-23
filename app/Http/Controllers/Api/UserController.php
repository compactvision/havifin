<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = User::with(['roles', 'shops'])->orderBy('created_at', 'desc');

        // If not super-admin, filter by shops the manager is assigned to
        if (!$user->isSuperAdmin()) {
            $shopIds = $user->shops->pluck('id');
            $query->whereHas('shops', function($q) use ($shopIds) {
                $q->whereIn('shops.id', $shopIds);
            });
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(['cashier', 'manager', 'client'])],
        ]);

        // Determine owner_id
        $creator = $request->user();
        $ownerId = $creator->role === 'super-admin' ? $creator->id : $creator->owner_id;

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
            'role' => $validated['role'],
            'owner_id' => $ownerId,
        ]);

        // Assign role using Spatie
        $user->assignRole($validated['role']);

        // Handle shop association
        if ($creator->isSuperAdmin()) {
            // Super admin can specify shop_ids or leave it to be assigned later
            if ($request->has('shop_ids')) {
                $user->shops()->sync($request->shop_ids);
            }
        } else {
            // Manager: auto-assign to the manager's shop(s)
            $shopIds = $creator->shops->pluck('id');
            $user->shops()->sync($shopIds);
        }

        return response()->json([
            'user' => $user->load('roles'),
            'message' => 'Utilisateur créé avec succès',
        ], 201);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|string|min:8',
            'role' => ['sometimes', Rule::in(['cashier', 'manager', 'client'])],
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Update role if provided
        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
            unset($validated['role']);
        }

        $user->update($validated);

        return response()->json([
            'user' => $user->load('roles'),
            'message' => 'Utilisateur mis à jour avec succès',
        ]);
    }

    /**
     * Remove the specified user (soft delete by deactivating).
     */
    public function destroy(User $user)
    {
        $user->update(['is_active' => false]);

        return response()->json([
            'message' => 'Utilisateur désactivé avec succès',
        ]);
    }
}
