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
        if (!$request->user()) {
            return redirect('/login');
        }

        // Check if user has any of the allowed roles
        foreach ($roles as $role) {
            if ($request->user()->hasRole($role)) {
                return $next($request);
            }
        }

        // If user doesn't have required role, redirect based on their role
        if ($request->user()->hasRole('super-admin')) {
            return redirect('/admin/shops');
        } elseif ($request->user()->hasRole('client')) {
            return redirect('/clientform');
        } elseif ($request->user()->hasRole('cashier')) {
            return redirect('/cashier');
        } elseif ($request->user()->hasRole('manager')) {
            return redirect('/manager');
        }

        return redirect('/login');
    }
}
