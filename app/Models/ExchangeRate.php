<?php

namespace App\Models;

use App\Traits\HasOwner;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory, HasOwner;

    protected $fillable = [
        'currency_pair',
        'buy_rate',
        'sell_rate',
        'is_active',
        'owner_id',
    ];

    protected $casts = [
        'buy_rate' => 'decimal:8',
        'sell_rate' => 'decimal:8',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'currency_from',
        'currency_to',
        'rate',
    ];

    public function getCurrencyFromAttribute(): string
    {
        return $this->currencies()[0];
    }

    public function getCurrencyToAttribute(): string
    {
        return $this->currencies()[1];
    }

    public function getRateAttribute(): float
    {
        return (float) $this->buy_rate;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function currencies(): array
    {
        $currencies = explode('_', strtoupper($this->currency_pair), 2);

        return [$currencies[0] ?? '', $currencies[1] ?? ''];
    }
}
