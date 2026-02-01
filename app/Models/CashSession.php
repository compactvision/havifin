<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashSession extends Model
{
    /** @use HasFactory<\Database\Factories\CashSessionFactory> */
    protected $fillable = [
        'cash_register_id',
        'user_id',
        'work_session_id',
        'status',
        'opened_at',
        'closed_at',
        'opening_notes',
        'closing_notes',
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
