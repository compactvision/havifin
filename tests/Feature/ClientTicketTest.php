<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shop;
use App\Models\Session;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ClientTicketTest extends TestCase
{
    use RefreshDatabase;

    public function test_tickets_are_generated_sequentially_per_session()
    {
        // Setup Owner and Manager
        $owner = User::factory()->create(['role' => 'super-admin']);
        $user = User::factory()->create(['role' => 'manager', 'owner_id' => $owner->id]);
        $shop = Shop::create(['name' => 'Demo Shop', 'owner_id' => $owner->id, 'slug' => 'demo-shop']);
        $user->shops()->attach($shop);
        $user->refresh();
        $this->actingAs($user);

        // Open Session
        $session = Session::create([
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
            'opened_by' => $user->id,
            'status' => 'open',
            'opening_balance' => 0,
            'session_date' => now()->toDateString(),
            'opened_at' => now(),
        ]);

        // Create Client 1
        $response1 = $this->postJson('/api/clients', [
            'phone' => '1234567890',
            'operation_type' => 'depot',
            'service' => 'bank',
            'amount' => 100,
        ]);

        $response1->assertStatus(201)
            ->assertJson(['ticket_number' => '001']);

        // Create Client 2
        $response2 = $this->postJson('/api/clients', [
            'phone' => '0987654321',
            'operation_type' => 'retrait',
            'service' => 'mobile',
            'amount' => 50,
        ]);

        $response2->assertStatus(201)
            ->assertJson(['ticket_number' => '002']);
    }

    public function test_ticket_number_resets_on_new_session()
    {
         // Setup Owner and Manager
        $owner = User::factory()->create(['role' => 'super-admin']);
        $user = User::factory()->create(['role' => 'manager', 'owner_id' => $owner->id]);
        $shop = Shop::create(['name' => 'Demo Shop', 'owner_id' => $owner->id, 'slug' => 'demo-shop-2']);
        $user->shops()->attach($shop);
        $user->refresh();
        $this->actingAs($user);

        // Session 1 (Day 1)
        $session1 = Session::create([
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
            'opened_by' => $user->id,
            'status' => 'closed',
            'opening_balance' => 0,
            'session_date' => now()->subDay()->toDateString(),
            'opened_at' => now()->subDay(),
        ]);
        
        // Simulate clients in old session
        Client::create([
            'ticket_number' => '001',
            'phone' => '1111111111',
            'operation_type' => 'depot',
            'service' => 'bank',
            'status' => 'completed',
            'session_id' => $session1->id,
            'owner_id' => $user->id,
            'shop_id' => $shop->id
        ]);

         // Session 2 (Day 2 - Active)
        $session2 = Session::create([
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
            'opened_by' => $user->id,
            'status' => 'open',
            'opening_balance' => 0,
            'session_date' => now()->toDateString(),
            'opened_at' => now(),
        ]);

        // Create Client in New Session
        $response = $this->postJson('/api/clients', [
            'phone' => '1234567890',
            'operation_type' => 'depot',
            'service' => 'bank',
            'amount' => 100,
        ]);

        $response->assertStatus(201)
            ->assertJson(['ticket_number' => '001']);
    }
}
