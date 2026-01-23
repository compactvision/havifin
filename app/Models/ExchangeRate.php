<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'currency_pair',
        'buy_rate',
        'sell_rate',
        'is_active',
        'owner_id',
    ];

    protected $casts = [
        'buy_rate' => 'decimal:4',
        'sell_rate' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::addGlobalScope('owner', function (Builder $query) {
            $user = auth()->user();
            if ($user) {
                $table = $query->getModel()->getTable();
                if ($user->role === 'super-admin') {
                    $query->where($table . '.owner_id', $user->id);
                } elseif (in_array($user->role, ['manager', 'cashier', 'client'])) {
                    $query->where($table . '.owner_id', $user->owner_id);
                }
            }
        });
    }
}
