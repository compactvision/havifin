<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientPhone extends Model
{
    protected $fillable = [
        'client_id',
        'phone_number',
        'is_primary',
        'owner_id',
        'shop_id',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    /**
     * Get the client that owns the phone number.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
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
                    // Super-admin sees data they own
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
