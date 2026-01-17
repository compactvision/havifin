<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExchangeRateHistory extends Model
{
    protected $table = 'exchange_rate_history';

    protected $fillable = [
        'currency_from',
        'currency_to',
        'rate',
        'effective_from',
        'effective_to',
        'created_by',
        'session_id',
    ];

    protected $casts = [
        'rate' => 'decimal:6',
        'effective_from' => 'datetime',
        'effective_to' => 'datetime',
    ];

    /**
     * Get the user who created this rate.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the session this rate belongs to.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class);
    }

    /**
     * Scope to get currently active rates.
     */
    public function scopeActive($query)
    {
        $now = now();
        return $query->where('effective_from', '<=', $now)
            ->where(function ($q) use ($now) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>', $now);
            });
    }

    /**
     * Scope to get rates for a specific currency pair.
     */
    public function scopeForPair($query, string $from, string $to)
    {
        return $query->where('currency_from', $from)
            ->where('currency_to', $to);
    }
}
