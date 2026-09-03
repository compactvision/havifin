<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Model;

class News extends Model
{
    use HasOwner;

    protected $fillable = [
        'content',
        'is_active',
        'display_order',
        'owner_id',
        'shop_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
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
