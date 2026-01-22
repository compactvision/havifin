<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle login request.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les informations d\'identification fournies sont incorrectes.'],
            ]);
        }

        if (!$user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Votre compte a été désactivé. Contactez un administrateur.'],
            ]);
        }

        // Restrict Manager login if not assigned to any shop
        if ($user->hasRole('manager') && $user->shops()->count() === 0) {
            throw ValidationException::withMessages([
                'email' => ['Accès refusé. Vous n\'êtes assigné à aucune boutique.'],
            ]);
        }

        // Login user with web guard (session-based)
        Auth::login($user, $request->boolean('remember'));

        // Load roles for frontend
        $user->load('roles');
        
        // Get primary role
        $role = 'cashier';
        if ($user->hasRole('super-admin')) {
            $role = 'super-admin';
        } elseif ($user->hasRole('manager')) {
            $role = 'manager';
        } elseif ($user->hasRole('cashier')) {
            $role = 'cashier';
        } elseif ($user->hasRole('client')) {
            $role = 'client';
        }

        return response()->json([
            'user' => $user,
            'role' => $role,
            'message' => 'Connexion réussie',
        ]);
    }

    /**
     * Handle logout request.
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Déconnexion réussie',
        ]);
    }

    /**
     * Get authenticated user.
     */
    public function me(Request $request)
    {
        $user = $request->user()->load('roles');
        
        return response()->json([
            'user' => $user,
            'role' => $user->roles->first()?->name ?? 'cashier',
        ]);
    }
}
