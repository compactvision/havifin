<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Builder;

class Institution extends Model
{
    protected $fillable = [
        'name',
        'type',
        'code',
        'logo_url',
        'is_active',
        'owner_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Scope to get only active institutions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get only mobile money institutions.
     */
    public function scopeMobileMoney($query)
    {
        return $query->where('type', 'mobile_money');
    }

    /**
     * Scope to get only bank institutions.
     */
    public function scopeBank($query)
    {
        return $query->where('type', 'bank');
    }

    /**
     * Get the owner of this institution.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
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
                } elseif (in_array($user->role, ['manager', 'cashier'])) {
                    $query->where($table . '.owner_id', $user->owner_id);
                }
            }
        });
    }
}
