<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'ticket_number',
        'operation_type',
        'service',
        'currency_from',
        'currency_to',
        'amount_from',
        'amount_to',
        'exchange_rate',
        'commission',
        'cashier_email',
        'client_phone',
    ];

    protected $casts = [
        'amount_from' => 'decimal:2',
        'amount_to' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'commission' => 'decimal:2',
    ];
}
