<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Model;

class Institution extends Model
{
    use HasOwner;

    protected $fillable = [
        'name',
        'type',
        'code',
        'logo_url',
        'is_active',
        'owner_id',
        'settings',
        'low_balance_thresholds',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'low_balance_thresholds' => 'array',
    ];

    /**
     * The configured alert floor for this institution's float in a given
     * currency, or null if none is set for that currency.
     */
    public function thresholdFor(string $currency): ?float
    {
        $value = $this->low_balance_thresholds[$currency] ?? null;

        return $value !== null ? (float) $value : null;
    }

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
}
