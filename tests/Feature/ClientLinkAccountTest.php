<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientPhone;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientLinkAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_kiosk_client_can_link_a_new_phone_to_an_existing_account(): void
    {
        [$kiosk, $shop, $registered] = $this->kioskWithRegisteredClient();

        $this->actingAs($kiosk)
            ->postJson('/api/clients/add-phone', [
                'client_id' => $registered->id,
                'phone_number' => '0823232838',
            ])
            ->assertCreated()
            ->assertJsonPath('phone.phone_number', '0823232838');

        $this->assertDatabaseHas('client_phones', [
            'client_id' => $registered->id,
            'phone_number' => '0823232838',
            'shop_id' => $shop->id,
        ]);
    }

    public function test_kiosk_cannot_attach_a_phone_already_owned_by_another_registered_client(): void
    {
        [$kiosk, $shop, $registered] = $this->kioskWithRegisteredClient();
        $other = Client::create([
            'phone' => '0999888777',
            'first_name' => 'Autre',
            'last_name' => 'Client',
            'is_registered' => true,
            'shop_id' => $shop->id,
            'owner_id' => $shop->owner_id,
        ]);
        ClientPhone::create([
            'client_id' => $other->id,
            'phone_number' => '0999888777',
            'is_primary' => true,
            'shop_id' => $shop->id,
            'owner_id' => $shop->owner_id,
        ]);

        $this->actingAs($kiosk)
            ->postJson('/api/clients/add-phone', [
                'client_id' => $registered->id,
                'phone_number' => '0999888777',
            ])
            ->assertConflict();
    }

    /**
     * @return array{0: User, 1: Shop, 2: Client}
     */
    private function kioskWithRegisteredClient(): array
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $shop = Shop::create([
            'name' => 'HAVIFIN GOMBE',
            'slug' => 'havifin-gombe-'.uniqid(),
            'owner_id' => $owner->id,
            'is_active' => true,
        ]);
        $kiosk = User::factory()->create([
            'role' => 'client',
            'owner_id' => $owner->id,
        ]);
        $kiosk->shops()->attach($shop);

        $registered = Client::create([
            'phone' => '0811111111',
            'first_name' => 'Nephtali',
            'last_name' => 'Nlandu',
            'is_registered' => true,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);
        ClientPhone::create([
            'client_id' => $registered->id,
            'phone_number' => '0811111111',
            'is_primary' => true,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        return [$kiosk, $shop, $registered];
    }
}
