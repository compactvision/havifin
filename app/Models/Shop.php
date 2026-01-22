<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    /** @use HasFactory<\Database\Factories\ShopFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'address',
        'counter_count',
        'is_active',
    ];

    /**
     * Get the users assigned to this shop.
     */
    public function users()
    {
        return $this->belongsToMany(User::class);
    }
}
