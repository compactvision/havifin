<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasOwner;

class Transaction extends Model
{
    use HasFactory, HasOwner;

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
        'owner_id',
        'shop_id',
        'session_id',
    ];

    protected $casts = [
        'amount_from' => 'decimal:2',
        'amount_to' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'commission' => 'decimal:2',
    ];

    /**
     * Get the client associated with the transaction.
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the shop where the transaction occurred.
     */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Get the owner of this transaction.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the session this transaction belongs to.
     */
    public function session()
    {
        return $this->belongsTo(Session::class);
    }
}
