<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasOwner;

class News extends Model
{
    use HasOwner;

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
}
