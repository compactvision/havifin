<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegister extends Model
{
    /** @use HasFactory<\Database\Factories\CashRegisterFactory> */
    protected $fillable = [
        'shop_id',
        'counter_id',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function counter()
    {
        return $this->belongsTo(Counter::class);
    }

    public function balances()
    {
        return $this->hasMany(CashBalance::class);
    }

    public function sessions()
    {
        return $this->hasMany(CashSession::class);
    }

    public function activeSession()
    {
        return $this->hasOne(CashSession::class)->where('status', 'open')->latest();
    }
}
