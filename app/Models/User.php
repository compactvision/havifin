<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    protected $attributes = [
        'role' => 'cashier',
        'is_active' => true,
    ];

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
        return $this->role === UserRole::Manager->value;
    }

    /**
     * Check if user is a super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin->value;
    }

    /**
     * Check if user is a cashier.
     */
    public function isCashier(): bool
    {
        return $this->role === UserRole::Cashier->value;
    }

    /**
     * Check if user is a client (kiosk).
     */
    public function isClient(): bool
    {
        return $this->role === UserRole::Client->value;
    }

    /**
     * Determine whether the user has one of the supplied application roles.
     */
    public function hasApplicationRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Return the only valid landing page for this user's application role.
     */
    public function homePath(): string
    {
        return UserRole::from($this->role)->homePath();
    }

    /**
     * Check if user account is active.
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active;
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
            if (! auth()->hasUser()) {
                return;
            }

            $user = auth()->user();
            if ($user) {
                $table = $query->getModel()->getTable();

                if ($user->isSuperAdmin()) {
                    // Super-admin sees their own data (based on owner_id matching their ID)
                    // OR records where they ARE the owner (for users table self-reference)
                    // AND themselves
                    $query->where(function ($q) use ($user, $table) {
                        $q->where($table.'.owner_id', $user->id)
                            ->orWhere($table.'.id', $user->id);
                    });
                } elseif ($user->hasApplicationRole('manager', 'cashier', 'client')) {
                    if (! $user->owner_id) {
                        $query->where($table.'.id', $user->id);

                        return;
                    }

                    // Manager/Cashier/Client sees data belonging to their owner
                    $query->where(function ($q) use ($user, $table) {
                        $q->where($table.'.owner_id', $user->owner_id)
                            ->orWhere($table.'.id', auth()->id());
                    });
                }
            }
        });
    }

    /**
     * Get the counter assigned to this user (if cashier).
     */
    public function counter()
    {
        return $this->belongsTo(Counter::class, 'counter_id');
    }
}
