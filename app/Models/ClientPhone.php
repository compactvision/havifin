<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientPhone extends Model
{
    protected $fillable = [
        'client_id',
        'phone_number',
        'is_primary',
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
}
