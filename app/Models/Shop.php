<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Builder;

use App\Traits\HasOwner;

class Shop extends Model
{
    /** @use HasFactory<\Database\Factories\ShopFactory> */
    use HasFactory, HasOwner;

    protected $fillable = [
        'name',
        'slug',
        'address',
        'counter_count',
        'is_active',
        'owner_id',
    ];

    /**
     * Get the users assigned to this shop.
     */
    public function users()
    {
        return $this->belongsToMany(User::class);
    }

    /**
     * Get the owner of this shop.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
