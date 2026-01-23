<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'owner_id',
        'shop_id',
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
                    // Super-admin sees transactions they own
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
