<?php

namespace App\Models;

use App\Traits\HasOwner;
use Database\Factories\CashSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashSession extends Model
{
    /** @use HasFactory<CashSessionFactory> */
    use HasFactory, HasOwner;

    protected $fillable = [
        'cash_register_id',
        'user_id',
        'closed_by',
        'work_session_id',
        'status',
        'opened_at',
        'closed_at',
        'opening_notes',
        'closing_notes',
        'owner_id',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function register()
    {
        return $this->belongsTo(CashRegister::class, 'cash_register_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function closer()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function workSession()
    {
        return $this->belongsTo(Session::class, 'work_session_id');
    }

    public function amounts()
    {
        return $this->hasMany(CashSessionAmount::class);
    }

    public function movements()
    {
        return $this->hasMany(CashMovement::class);
    }
}
