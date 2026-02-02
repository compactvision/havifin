<?php

namespace Tests\Feature;

use App\Models\CashRegister;
use App\Models\CashSession;
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
        ]);
        
        $this->actingAs($cashier1);
        
        $response = $this->getJson('/api/cash/sessions/current');
        
        $response->assertStatus(200);
        $response->assertJsonPath('id', $session1->id);
        $response->assertJsonPath('user_id', $cashier1->id);
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
        
        $register = CashRegister::create([
            'shop_id' => $shop->id,
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
        
        $register = CashRegister::create([
            'shop_id' => $shop->id,
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
