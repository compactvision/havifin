<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasOwner;

class CashMovement extends Model
{
    /** @use HasFactory<\Database\Factories\CashMovementFactory> */
    use HasFactory, HasOwner;

    protected $fillable = [
        'cash_session_id',
        'transaction_id',
        'user_id',
        'type', // deposit, withdrawal, exchange_in, exchange_out, adjustment_in, adjustment_out
        'currency',
        'amount',
        'description',
        'metadata',
        'owner_id',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'metadata' => 'array',
    ];

    public function session()
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
