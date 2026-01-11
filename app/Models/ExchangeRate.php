<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'currency_pair',
        'buy_rate',
        'sell_rate',
        'is_active',
    ];

    protected $casts = [
        'buy_rate' => 'decimal:4',
        'sell_rate' => 'decimal:4',
        'is_active' => 'boolean',
    ];
}
