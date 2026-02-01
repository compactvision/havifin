<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\CashSession;

class CashSessionAmount extends Model
{
    protected $fillable = [
        'cash_session_id',
        'currency',
        'opening_amount',
        'closing_amount_theoretical',
        'closing_amount_real',
        'difference',
    ];

    protected $casts = [
        'opening_amount' => 'decimal:4',
        'closing_amount_theoretical' => 'decimal:4',
        'closing_amount_real' => 'decimal:4',
        'difference' => 'decimal:4',
    ];

    public function session()
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }
}
