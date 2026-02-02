<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasOwner;

class CashRegister extends Model
{
    /** @use HasFactory<\Database\Factories\CashRegisterFactory> */
    use HasFactory, HasOwner;

    protected $fillable = [
        'shop_id',
        'counter_id',
        'name',
        'is_active',
        'owner_id',
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
        return $this->hasOne(CashSession::class)->where('status', 'open')->orderBy('opened_at', 'desc');
    }
}
