<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsManager
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (
            ! $request->user()
            || ! $request->user()->isActive()
            || ! $request->user()->isManager()
        ) {
            return response()->json([
                'message' => 'Accès refusé. Seuls les managers peuvent accéder à cette ressource.',
            ], 403);
        }

        return $next($request);
    }
}
