<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Model;

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
        'shop_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'type' => 'string',
    ];

    /**
     * Rows carrying this shop, plus the owner-wide ones (null shop_id) that
     * every shop displays.
     */
    public function scopeForShop($query, $shopId)
    {
        if (! $shopId) {
            return $query;
        }

        return $query->where(function ($q) use ($shopId) {
            $q->where('shop_id', $shopId)->orWhereNull('shop_id');
        });
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

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
