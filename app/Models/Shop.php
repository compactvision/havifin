<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Builder;

class Shop extends Model
{
    /** @use HasFactory<\Database\Factories\ShopFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'address',
        'counter_count',
        'is_active',
        'owner_id',
    ];

    /**
     * Get the users assigned to this shop.
     */
    public function users()
    {
        return $this->belongsToMany(User::class);
    }

    /**
     * Get the owner of this shop.
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
