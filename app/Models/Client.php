<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'phone',
        'operation_type',
        'service',
        'currency_from',
        'currency_to',
        'amount',
        'status',
        'called_at',
        'completed_at',
        'cashier_id',
        'notes',
    ];

    protected $casts = [
        'called_at' => 'datetime',
        'completed_at' => 'datetime',
        'amount' => 'decimal:2',
    ];
}
