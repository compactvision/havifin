<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! $request->user()->isActive()) {
            if ($request->user()) {
                $accessToken = $request->user()->currentAccessToken();
                if ($accessToken && method_exists($accessToken, 'delete')) {
                    $accessToken->delete();
                }
                auth('web')->logout();

                if ($request->hasSession()) {
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                }
            }

            return $request->expectsJson()
                ? response()->json(['message' => 'Compte inactif ou non authentifié.'], 401)
                : redirect()->route('login');
        }

        return $next($request);
    }
}
