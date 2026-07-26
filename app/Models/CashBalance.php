<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Model;

class CashBalance extends Model
{
    use HasOwner;

    protected $fillable = [
        'cash_register_id',
        'currency',
        'amount',
        'owner_id',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
    ];

    public function register()
    {
        return $this->belongsTo(CashRegister::class, 'cash_register_id');
    }
}
