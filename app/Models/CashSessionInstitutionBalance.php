<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Model;

class CashSessionInstitutionBalance extends Model
{
    use HasOwner;

    protected $fillable = [
        'cash_session_id',
        'institution_id',
        'currency',
        'opening_amount',
        'current_theoretical',
        'closing_amount_real',
        'difference',
        'owner_id',
    ];

    protected $casts = [
        'opening_amount' => 'decimal:4',
        'current_theoretical' => 'decimal:4',
        'closing_amount_real' => 'decimal:4',
        'difference' => 'decimal:4',
    ];

    public function session()
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function institution()
    {
        return $this->belongsTo(Institution::class);
    }
}
