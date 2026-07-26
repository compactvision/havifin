<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory, HasOwner;

    protected $appends = ['created_date'];

    protected $fillable = [
        'ticket_number',
        'phone',
        'first_name',
        'last_name',
        'email',
        'address',
        'is_registered',
        'operation_type',
        'service',
        'currency_from',
        'currency_to',
        'amount',
        'amount_from',
        'exchange_rate',
        'status',
        'called_at',
        'completed_at',
        'cashier_id',
        'counter_number',
        'notes',
        'shop_id',
        'owner_id',
        'metadata',
        'session_id',
    ];

    protected $casts = [
        'called_at' => 'datetime',
        'completed_at' => 'datetime',
        'amount' => 'decimal:2',
        'amount_from' => 'decimal:2',
        'exchange_rate' => 'decimal:8',
        'is_registered' => 'boolean',
        'metadata' => 'array',
    ];

    /**
     * Get all phone numbers for this client.
     */
    public function phones()
    {
        return $this->hasMany(ClientPhone::class);
    }

    /**
     * Get the primary phone number for this client.
     */
    public function primaryPhone()
    {
        return $this->hasOne(ClientPhone::class)->where('is_primary', true);
    }

    /**
     * Get the client's full name.
     */
    public function getFullNameAttribute(): ?string
    {
        if ($this->first_name && $this->last_name) {
            return trim("{$this->first_name} {$this->last_name}");
        }

        return null;
    }

    /**
     * Check if client is registered with name.
     */
    public function hasName(): bool
    {
        return ! empty($this->first_name) && ! empty($this->last_name);
    }

    /**
     * Get the shop that this client ticket belongs to.
     */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Get the session this client ticket belongs to.
     */
    public function session()
    {
        return $this->belongsTo(Session::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Compatibility field consumed by the existing React application.
     */
    public function getCreatedDateAttribute(): ?string
    {
        return $this->created_at?->toIso8601String();
    }
}
