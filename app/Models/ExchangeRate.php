<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasOwner;

class ExchangeRate extends Model
{
    use HasFactory, HasOwner;

    protected $fillable = [
        'currency_pair',
        'buy_rate',
        'sell_rate',
        'is_active',
        'owner_id',
    ];

    protected $casts = [
        'buy_rate' => 'decimal:4',
        'sell_rate' => 'decimal:4',
        'is_active' => 'boolean',
    ];
}
