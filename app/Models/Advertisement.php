<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOwner;

class Advertisement extends Model
{
    use HasOwner;

    protected $fillable = [
        'title',
        'type',
        'image_url',
        'display_order',
        'is_active',
        'owner_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'type' => 'string',
    ];

    /**
     * Scope to get only active advertisements.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get advertisements ordered by display order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    /**
     * Get the owner of this advertisement.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
