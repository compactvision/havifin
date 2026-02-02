<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Traits\HasOwner;

class Counter extends Model
{
    use HasFactory, HasOwner;

    protected $fillable = [
        'shop_id',
        'counter_number',
        'name',
        'cashier_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the shop that owns the counter.
     */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Get the cashier assigned to this counter.
     */
    public function cashiers()
    {
        return $this->hasMany(User::class, 'counter_id');
    }

    /**
     * Get the current cashier assigned to this counter.
     */
    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }
}
