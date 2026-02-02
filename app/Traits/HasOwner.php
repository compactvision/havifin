<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait HasOwner
{
    /**
     * Boot the trait.
     */
    protected static function bootHasOwner()
    {
        static::addGlobalScope('owner', function (Builder $query) {
            if (!auth()->hasUser()) {
                return;
            }

            $user = auth()->user();
            if ($user) {
                $model = $query->getModel();
                $table = $model->getTable();
                
                // Determine the effective owner ID (the Tenant Root)
                $ownerId = ($user->role === 'super-admin' || ($user->role === 'manager' && !$user->owner_id)) 
                    ? $user->id 
                    : $user->owner_id;

                if ($user->role === 'super-admin') {
                    $query->where($table . '.owner_id', $user->id);
                } elseif (in_array($user->role, ['manager', 'cashier', 'client'])) {
                    $query->where($table . '.owner_id', $ownerId);

                    // Optional shop isolation for cashiers and clients
                    if (in_array($user->role, ['cashier', 'client']) && \Schema::hasColumn($table, 'shop_id')) {
                        $shopId = $user->shops()->first()?->id;
                        if ($shopId) {
                            $query->where($table . '.shop_id', $shopId);
                        }
                    }
                }
            }
        });

        static::creating(function ($model) {
            if (!$model->owner_id && auth()->check()) {
                $user = auth()->user();
                $model->owner_id = ($user->role === 'super-admin' || ($user->role === 'manager' && !$user->owner_id)) 
                    ? $user->id 
                    : $user->owner_id;
            }
        });
    }
}
