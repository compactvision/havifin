<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Institution extends Model
{
    protected $fillable = [
        'name',
        'type',
        'code',
        'logo_url',
        'is_active',
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
}
