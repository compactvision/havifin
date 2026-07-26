<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Handle logout request.
     */
    public function logout(Request $request)
    {
        $user = auth()->user();
        if ($user) {
            CashierActivity::create([
                'cashier_id' => $user->id,
                'activity_type' => 'logout',
                'description' => "Déconnexion utilisateur: {$user->name}",
                'created_at' => now(),
            ]);

            $accessToken = $request->user()?->currentAccessToken();
            if ($accessToken && method_exists($accessToken, 'delete')) {
                $accessToken->delete();
            }
        }

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
            'role' => $user->role,
        ]);
    }
}
