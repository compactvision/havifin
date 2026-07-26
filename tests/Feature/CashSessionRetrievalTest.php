<?php

namespace Tests\Feature;

use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Counter;
use App\Models\Session;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashSessionRetrievalTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_sees_their_own_session_in_shop()
    {
        $owner = User::create([
            'name' => 'Owner',
            'email' => 'owner@test.com',
            'password' => bcrypt('password'),
            'role' => 'super-admin',
        ]);

        $shop = Shop::create([
            'name' => 'Test Shop',
            'slug' => 'test-shop',
            'owner_id' => $owner->id,
        ]);

        $cashier1 = User::create([
            'name' => 'Cashier 1',
            'email' => 'c1@test.com',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);

        $cashier2 = User::create([
            'name' => 'Cashier 2',
            'email' => 'c2@test.com',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);

        $cashier1->shops()->attach($shop);
        $cashier2->shops()->attach($shop);

        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'name' => 'Register 1',
        ]);
        $workSession = Session::create([
            'shop_id' => $shop->id,
            'session_date' => today(),
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $owner->id,
            'owner_id' => $owner->id,
        ]);

        // Session for cashier 2 (Yesterday/Old)
        CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier2->id,
            'status' => 'open',
            'opened_at' => now()->subDay(),
        ]);

        // Session for cashier 1 (Today/Active)
        $session1 = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier1->id,
            'status' => 'open',
            'opened_at' => now(),
            'work_session_id' => $workSession->id,
        ]);

        $this->actingAs($cashier1);

        $response = $this->getJson('/api/cash/sessions/current');

        $response->assertStatus(200);
        $response->assertJsonPath('id', $session1->id);
        $response->assertJsonPath('user_id', $cashier1->id);
    }

    public function test_cashier_sees_the_open_shop_day_before_opening_their_till(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Boutique ouverte',
            'slug' => 'boutique-ouverte',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);
        $workSession = Session::create([
            'shop_id' => $shop->id,
            'session_date' => today(),
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $owner->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($cashier)
            ->getJson('/api/sessions/current')
            ->assertOk()
            ->assertJsonPath('id', $workSession->id)
            ->assertJsonPath('status', 'open');

        $this->getJson('/api/cash/sessions/current')
            ->assertOk()
            ->assertContent('null');
    }

    public function test_manager_opening_the_day_allows_the_assigned_cashier_to_open_their_till(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Boutique flux complet',
            'slug' => 'boutique-flux-complet',
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shop);
        $cashier->shops()->attach($shop);
        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 1,
            'name' => 'Guichet flux complet',
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $counter->id,
            'name' => 'Caisse flux complet',
        ]);

        $workSessionId = $this->actingAs($manager)
            ->postJson('/api/sessions', [
                'session_date' => today()->toDateString(),
                'shop_id' => $shop->id,
            ])
            ->assertCreated()
            ->json('id');

        $this->actingAs($cashier)
            ->getJson('/api/sessions/current')
            ->assertOk()
            ->assertJsonPath('id', $workSessionId);

        $this->getJson('/api/cash/sessions/current')
            ->assertOk()
            ->assertContent('null');

        $cashSessionId = $this->postJson('/api/cash/sessions', [
            'cash_register_id' => $register->id,
            'opening_amounts' => [
                'USD' => 100,
                'CDF' => 0,
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('work_session_id', $workSessionId)
            ->json('id');

        $this->getJson('/api/cash/sessions/current')
            ->assertOk()
            ->assertJsonPath('id', $cashSessionId)
            ->assertJsonPath('user_id', $cashier->id);
    }

    public function test_prioritizes_session_in_current_work_session()
    {
        $owner = User::create([
            'name' => 'Owner',
            'email' => 'owner2@test.com',
            'password' => bcrypt('password'),
            'role' => 'super-admin',
        ]);

        $shop = Shop::create([
            'name' => 'Test Shop 2',
            'slug' => 'test-shop-2',
            'owner_id' => $owner->id,
        ]);

        $cashier = User::create([
            'name' => 'Cashier',
            'email' => 'c@test.com',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);

        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 1,
            'name' => 'Guichet 1',
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();

        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $counter->id,
            'name' => 'Register 1',
        ]);

        // Old work session with an open cash session
        $oldWorkSession = Session::create([
            'shop_id' => $shop->id,
            'session_date' => now()->subDay(),
            'status' => 'closed',
            'opened_at' => now()->subDay(),
            'opened_by' => $owner->id,
            'owner_id' => $owner->id,
        ]);

        $oldCashSession = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'status' => 'open',
            'opened_at' => now()->subDay(),
            'work_session_id' => $oldWorkSession->id,
        ]);

        // New work session
        $currentWorkSession = Session::create([
            'shop_id' => $shop->id,
            'session_date' => now(),
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $owner->id,
            'owner_id' => $owner->id,
        ]);

        $currentCashSession = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'status' => 'open',
            'opened_at' => now(),
            'work_session_id' => $currentWorkSession->id,
        ]);

        $this->actingAs($cashier);

        $response = $this->getJson('/api/cash/sessions/current');

        $response->assertStatus(200);
        $response->assertJsonPath('id', $currentCashSession->id);
        $response->assertJsonPath('work_session_id', $currentWorkSession->id);
    }

    public function test_dashboard_shows_correct_active_session()
    {
        $owner = User::create([
            'name' => 'Owner',
            'email' => 'owner3@test.com',
            'password' => bcrypt('password'),
            'role' => 'super-admin',
        ]);

        $shop = Shop::create([
            'name' => 'Test Shop 3',
            'slug' => 'test-shop-3',
            'owner_id' => $owner->id,
        ]);

        $cashier = User::create([
            'name' => 'Cashier',
            'email' => 'c3@test.com',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);

        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 1,
            'name' => 'Guichet 1',
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();

        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $counter->id,
            'name' => 'Register 1',
        ]);

        // Old session on this register
        CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'status' => 'open',
            'opened_at' => now()->subDay(),
        ]);

        // Current work session
        $workSession = Session::create([
            'shop_id' => $shop->id,
            'session_date' => now(),
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $owner->id,
            'owner_id' => $owner->id,
        ]);

        // Today's session
        $sessionToday = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'status' => 'open',
            'opened_at' => now(),
            'work_session_id' => $workSession->id,
        ]);

        $this->actingAs($cashier);

        $response = $this->getJson('/api/cash/registers');

        $response->assertStatus(200);
        $response->assertJsonFragment(['id' => $register->id]);

        // Find the register in the response and check its active_session
        $data = $response->json();
        $this->assertEquals($sessionToday->id, $data[0]['active_session']['id']);
    }
}
