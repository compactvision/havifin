<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\CashRegister;

class CashBalance extends Model
{
    protected $fillable = [
        'cash_register_id',
        'currency',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
    ];

    public function register()
    {
        return $this->belongsTo(CashRegister::class, 'cash_register_id');
    }
}
