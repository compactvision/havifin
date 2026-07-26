<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\User;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
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

        if ($user->isSuperAdmin()) {
            $query->where('role', 'manager');
        } else {
            // Managers only see personnel assigned to their own shops.
            $shopIds = $user->shops->pluck('id');
            $query->whereHas('shops', function ($q) use ($shopIds) {
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
        $allowedRoles = $request->user()->isSuperAdmin()
            ? ['manager']
            : ['cashier', 'client'];

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', Password::defaults()],
            'role' => ['required', Rule::in($allowedRoles)],
            'shop_ids' => 'sometimes|array',
            'shop_ids.*' => 'integer|exists:shops,id',
        ]);

        // Determine owner_id
        $creator = $request->user();
        $ownerId = TenantAccess::ownerId($creator);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
            'role' => $validated['role'],
            'owner_id' => $ownerId,
        ]);

        // Assign role using Spatie
        $user->assignRole(Role::findOrCreate($validated['role'], 'web'));

        // Handle shop association
        if ($creator->isSuperAdmin()) {
            // Super admin can specify shop_ids or leave it to be assigned later
            if (! empty($validated['shop_ids'])) {
                foreach ($validated['shop_ids'] as $shopId) {
                    TenantAccess::authorizeShop($creator, $shopId);
                }
                $user->shops()->sync($validated['shop_ids']);
            }
        } else {
            $shopIds = collect(
                $validated['shop_ids'] ?? $creator->shops->pluck('id')->all()
            )->unique()->values();
            abort_if($shopIds->isEmpty(), 422, 'Sélectionnez au moins une boutique.');
            foreach ($shopIds as $shopId) {
                TenantAccess::authorizeShop($creator, (int) $shopId);
            }
            $user->shops()->sync($shopIds);
        }

        CashierActivity::logAction('configuration_change', "Utilisateur créé: {$user->name} ({$user->role})");

        return response()->json([
            'user' => $user->load(['roles', 'shops']),
            'message' => 'Utilisateur créé avec succès',
        ], 201);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $this->authorizeManagedUser($request->user(), $user);
        $allowedRoles = $request->user()->isSuperAdmin()
            ? ['manager']
            : ['cashier', 'client'];

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => ['sometimes', 'string', Password::defaults()],
            'role' => ['sometimes', Rule::in($allowedRoles)],
            'is_active' => 'sometimes|boolean',
            'shop_ids' => 'sometimes|array|min:1',
            'shop_ids.*' => 'integer|exists:shops,id',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Update role if provided
        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        $user->update(collect($validated)->except('shop_ids')->all());

        if (isset($validated['shop_ids'])) {
            foreach ($validated['shop_ids'] as $shopId) {
                TenantAccess::authorizeShop($request->user(), (int) $shopId);
            }
            $user->shops()->sync(array_values(array_unique($validated['shop_ids'])));
        }

        CashierActivity::logAction('configuration_change', "Utilisateur mis à jour: {$user->name}");

        return response()->json([
            'user' => $user->load(['roles', 'shops']),
            'message' => 'Utilisateur mis à jour avec succès',
        ]);
    }

    /**
     * Remove the specified user (soft delete by deactivating).
     */
    public function destroy(Request $request, User $user)
    {
        $this->authorizeManagedUser($request->user(), $user);
        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        DB::table('sessions')->where('user_id', $user->id)->delete();

        CashierActivity::logAction('configuration_change', "Utilisateur désactivé: {$user->name}");

        return response()->json([
            'message' => 'Utilisateur désactivé avec succès',
        ]);
    }

    private function authorizeManagedUser(User $actor, User $target): void
    {
        abort_if($actor->is($target), 422, 'Vous ne pouvez pas gérer votre propre compte ici.');
        abort_if($target->isSuperAdmin(), 403, 'Un super-administrateur ne peut pas être modifié.');
        abort_unless((int) $target->owner_id === TenantAccess::ownerId($actor), 403);

        if ($actor->isSuperAdmin()) {
            abort_unless($target->isManager(), 403, 'Le Super Admin gère uniquement les managers.');
        } else {
            $actorShopIds = $actor->shops()->pluck('shops.id');
            abort_unless(
                $target->hasApplicationRole('cashier', 'client'),
                403,
                'Un manager gère uniquement les caissiers et les comptes client.',
            );
            abort_unless(
                $target->shops()->whereIn('shops.id', $actorShopIds)->exists(),
                403,
                'Utilisateur hors de vos boutiques.',
            );
            abort_if(
                $target->shops()->whereNotIn('shops.id', $actorShopIds)->exists(),
                403,
                'Cet utilisateur travaille aussi dans une boutique que vous ne gérez pas.',
            );
        }
    }
}
