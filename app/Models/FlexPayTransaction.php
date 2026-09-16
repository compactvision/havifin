<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Model;

class FlexPayTransaction extends Model
{
    use HasOwner;

    protected $table = 'flexpay_transactions';

    protected $fillable = [
        'client_id',
        'institution_id',
        'shop_id',
        'owner_id',
        'cashier_id',
        'cash_session_id',
        'session_id',
        'transaction_id',
        'reference',
        'order_number',
        'phone',
        'amount',
        'currency',
        'status',
        'provider_status_code',
        'provider_reference',
        'channel',
        'amount_customer',
        'message',
        'raw_response',
        'attempts',
        'last_checked_at',
        'finalized_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'amount_customer' => 'decimal:2',
        'raw_response' => 'array',
        'attempts' => 'integer',
        'last_checked_at' => 'datetime',
        'finalized_at' => 'datetime',
    ];

    public const TERMINAL_STATUSES = ['success', 'failed', 'refunded', 'cancelled', 'timeout'];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function institution()
    {
        return $this->belongsTo(Institution::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function cashSession()
    {
        return $this->belongsTo(CashSession::class);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, self::TERMINAL_STATUSES, true);
    }
}
