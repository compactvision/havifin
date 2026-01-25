<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class News extends Model
{
    protected $fillable = [
        'content',
        'is_active',
        'display_order',
        'owner_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
    ];

    /**
     * Scope to get only active news.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get news ordered by display order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::addGlobalScope('owner', function (Builder $query) {
            $user = auth()->user();
            if ($user) {
                $table = $query->getModel()->getTable();
                if ($user->role === 'super-admin') {
                    $query->where($table . '.owner_id', $user->id);
                } elseif (in_array($user->role, ['manager', 'cashier', 'client'])) {
                    $query->where($table . '.owner_id', $user->owner_id);
                }
            }
        });
    }
}
