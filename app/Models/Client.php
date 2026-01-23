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
        'status',
        'called_at',
        'completed_at',
        'cashier_id',
        'counter_number',
        'notes',
        'shop_id',
    ];

    protected $casts = [
        'called_at' => 'datetime',
        'completed_at' => 'datetime',
        'amount' => 'decimal:2',
        'is_registered' => 'boolean',
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
        return !empty($this->first_name) && !empty($this->last_name);
    }
    /**
     * Get the shop that this client ticket belongs to.
     */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }
}
