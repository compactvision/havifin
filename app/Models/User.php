<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

use Illuminate\Database\Eloquent\Builder;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
        'role',
        'owner_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Check if user is a manager.
     */
    public function isManager(): bool
    {
        return $this->role === 'manager' || $this->hasRole('manager');
    }

    /**
     * Check if user is a super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super-admin' || $this->hasRole('super-admin');
    }

    /**
     * Check if user is a cashier.
     */
    public function isCashier(): bool
    {
        return $this->role === 'cashier' || $this->hasRole('cashier');
    }

    /**
     * Check if user is a client (kiosk).
     */
    public function isClient(): bool
    {
        return $this->role === 'client' || $this->hasRole('client');
    }

    /**
     * Check if user account is active.
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Scope a query to only include active users.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the shops assigned to this user.
     */
    public function shops()
    {
        return $this->belongsToMany(Shop::class);
    }

    /**
     * Get the owner of this user (the super-admin).
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the users owned by this user (if super-admin).
     */
    public function ownedUsers()
    {
        return $this->hasMany(User::class, 'owner_id');
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
                    // Super-admin sees their own data (based on owner_id matching their ID)
                    // OR records where they ARE the owner (for users table self-reference)
                    // AND themselves
                    $query->where(function ($q) use ($user, $table) {
                        $q->where($table . '.owner_id', $user->id)
                          ->orWhere($table . '.id', $user->id);
                    });
                } elseif (in_array($user->role, ['manager', 'cashier', 'client'])) {
                    // Manager/Cashier/Client sees data belonging to their owner
                    $query->where($table . '.owner_id', $user->owner_id);
                }
            }
        });
    }

    /**
     * Get the counter assigned to this user (if cashier).
     */
    public function counter()
    {
        return $this->hasOne(Counter::class, 'cashier_id');
    }
}
