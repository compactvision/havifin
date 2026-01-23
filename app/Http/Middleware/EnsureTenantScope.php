<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantScope
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if ($user) {
            // Define current tenant ID
            // If super-admin, they are the tenant (id)
            // If manager/cashier, their owner is the tenant (owner_id)
            $tenantId = $user->role === 'super-admin' ? $user->id : $user->owner_id;
            
            // Store tenant_id in session/request ensuring downstream logic has access
            if ($tenantId) {
                $request->merge(['tenant_id' => $tenantId]);
            }
        }

        return $next($request);
    }
}
