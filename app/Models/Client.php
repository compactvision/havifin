<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'owner_id',
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

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::addGlobalScope('owner', function (Builder $query) {
            // Prevent infinite recursion: only apply scope if user is already authenticated/loaded
            if (!auth()->hasUser()) {
                return;
            }

            $user = auth()->user();
            if ($user) {
                $table = $query->getModel()->getTable();
                if ($user->role === 'super-admin') {
                    // Super-admin sees clients they own
                    $query->where($table . '.owner_id', $user->id);
                } elseif (in_array($user->role, ['manager', 'cashier', 'client'])) {
                    // Manager/Cashier/Client sees data belonging to their owner
                    $query->where($table . '.owner_id', $user->owner_id);

                    // Further filter by shop if it's a cashier or client
                    if (in_array($user->role, ['cashier', 'client'])) {
                        $shopId = $user->shops()->first()?->id;
                        if ($shopId) {
                            $query->where($table . '.shop_id', $shopId);
                        }
                    }
                }
            }
        });
    }
}
