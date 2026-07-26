<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

trait HasOwner
{
    /**
     * Boot the trait.
     */
    protected static function bootHasOwner()
    {
        static::addGlobalScope('owner', function (Builder $query) {
            if (! auth()->hasUser()) {
                return;
            }

            $user = auth()->user();
            if ($user) {
                $model = $query->getModel();
                $table = $model->getTable();

                if ($user->isSuperAdmin()) {
                    $query->where($table.'.owner_id', $user->id);
                } elseif ($user->hasApplicationRole('manager', 'cashier', 'client')) {
                    if (! $user->owner_id) {
                        $query->whereRaw('1 = 0');

                        return;
                    }

                    $query->where($table.'.owner_id', $user->owner_id);

                    // Optional shop isolation for cashiers and clients
                    if ($user->hasApplicationRole('cashier', 'client') && \Schema::hasColumn($table, 'shop_id')) {
                        $shopId = $user->shops()->first()?->id;
                        if ($shopId) {
                            $query->where($table.'.shop_id', $shopId);
                        }
                    }
                }
            }
        });

        static::creating(function ($model) {
            if ($model->owner_id) {
                return;
            }

            if (auth()->check()) {
                $user = auth()->user();
                $model->owner_id = $user->isSuperAdmin()
                    ? $user->id
                    : $user->owner_id;

                throw_if(
                    ! $model->owner_id,
                    \LogicException::class,
                    'A tenant-owned model cannot be created without an owner.',
                );

                return;
            }

            // Queue jobs, imports and tests may create tenant-owned records
            // without an authenticated request. Derive the tenant from the
            // parent resource instead of leaving owner_id null.
            if ($model->getAttribute('shop_id')) {
                $model->owner_id = DB::table('shops')
                    ->where('id', $model->getAttribute('shop_id'))
                    ->value('owner_id');
            } elseif ($model->getAttribute('cash_register_id')) {
                $model->owner_id = DB::table('cash_registers')
                    ->where('id', $model->getAttribute('cash_register_id'))
                    ->value('owner_id');
            } elseif ($model->getAttribute('cash_session_id')) {
                $model->owner_id = DB::table('cash_sessions')
                    ->where('id', $model->getAttribute('cash_session_id'))
                    ->value('owner_id');
            }
        });
    }
}
