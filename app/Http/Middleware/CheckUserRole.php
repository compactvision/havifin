<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Non authentifié.'], 401)
                : redirect()->route('login');
        }

        if (! $user->isActive()) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Compte désactivé.'], 403)
                : redirect()->route('login');
        }

        if ($user->hasApplicationRole(...$roles)) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return redirect($user->homePath());
    }
}
