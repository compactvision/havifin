<?php

namespace Tests\Feature;

use App\Models\Session;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectionalExchangeRateTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_the_configured_direction_is_available_and_uses_its_direct_rate(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $client = User::factory()->create([
            'role' => 'client',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Havifin Gombe',
            'slug' => 'havifin-gombe-directional-rate',
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shop);
        $client->shops()->attach($shop);

        Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($manager)
            ->postJson('/api/exchange-rates', [
                'currency_pair' => 'CDF_USD',
                'rate' => 0.00044,
            ])
            ->assertCreated()
            ->assertJsonPath('currency_from', 'CDF')
            ->assertJsonPath('currency_to', 'USD')
            ->assertJsonPath('rate', 0.00044);

        $this->actingAs($client)
            ->getJson('/api/exchange-rates')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.currency_pair', 'CDF_USD');

        $this->postJson('/api/clients', [
            'phone' => '0990000001',
            'operation_type' => 'change',
            'service' => 'bureau',
            'currency_from' => 'CDF',
            'currency_to' => 'USD',
            'amount_from' => 2250000,
            'exchange_rate' => 9999,
        ])
            ->assertCreated()
            ->assertJsonPath('exchange_rate', '0.00044000')
            ->assertJsonPath('amount', '990.00');

        $this->postJson('/api/clients', [
            'phone' => '0990000002',
            'operation_type' => 'change',
            'service' => 'bureau',
            'currency_from' => 'USD',
            'currency_to' => 'CDF',
            'amount_from' => 1,
            'exchange_rate' => 2250,
        ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Aucun taux n’est configuré pour USD → CDF.',
            );
    }
}
