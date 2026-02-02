<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Builder;

use App\Traits\HasOwner;

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
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
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
}
