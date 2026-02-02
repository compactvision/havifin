<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Session extends Model
{
    use HasFactory, HasOwner;

    protected $table = 'work_sessions';

    protected $fillable = [
        'session_date',
        'opened_by',
        'closed_by',
        'opened_at',
        'closed_at',
        'status',
        'notes',
        'shop_id',
        'owner_id',
    ];

    protected $casts = [
        'session_date' => 'date',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'shop_id' => 'integer',
        'owner_id' => 'integer',
    ];

    /**
     * Get the user who opened the session.
     */
    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /**
     * Get the user who closed the session.
     */
    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * Get the cashier activities for this session.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(CashierActivity::class);
    }

    /**
     * Get the exchange rates for this session.
     */
    public function exchangeRates(): HasMany
    {
        return $this->hasMany(ExchangeRateHistory::class);
    }

    /**
     * Get the shop this session belongs to.
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Scope to get only open sessions.
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope to get only closed sessions.
     */
    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }
}
