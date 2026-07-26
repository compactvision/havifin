<?php

namespace Tests\Feature;

use App\Models\CashBalance;
use App\Models\CashierActivity;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\Counter;
use App\Models\Session;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_api_requires_authentication(): void
    {
        $this->getJson('/api/transactions')->assertUnauthorized();
        $this->getJson('/api/cash/registers')->assertUnauthorized();
        $this->getJson('/api/exchange-rates')->assertUnauthorized();
    }

    public function test_inactive_user_cannot_access_the_api(): void
    {
        $user = User::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->getJson('/api/transactions')
            ->assertUnauthorized();
    }

    public function test_cashier_cannot_manage_users(): void
    {
        $cashier = User::factory()->create(['role' => 'cashier']);

        $this->actingAs($cashier)
            ->getJson('/api/users')
            ->assertForbidden();
    }

    public function test_manager_cannot_access_another_tenants_shop(): void
    {
        $ownerA = User::factory()->create(['role' => 'super-admin']);
        $ownerB = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $ownerA->id,
        ]);
        $shopA = Shop::create([
            'name' => 'Boutique A',
            'slug' => 'boutique-a',
            'owner_id' => $ownerA->id,
        ]);
        $shopB = Shop::create([
            'name' => 'Boutique B',
            'slug' => 'boutique-b',
            'owner_id' => $ownerB->id,
        ]);
        $manager->shops()->attach($shopA);

        $this->actingAs($manager)
            ->getJson("/api/shops/{$shopB->id}")
            ->assertNotFound();
    }

    public function test_transaction_uses_server_ticket_data_and_cannot_be_processed_twice(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Boutique sécurisée',
            'slug' => 'boutique-securisee',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);
        $this->actingAs($cashier);

        $workSession = Session::create([
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
            'opened_by' => $cashier->id,
            'status' => 'open',
            'session_date' => now()->toDateString(),
            'opened_at' => now(),
        ]);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'name' => 'Caisse principale',
        ]);
        CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'work_session_id' => $workSession->id,
            'status' => 'open',
            'opened_at' => now(),
        ]);
        $client = Client::create([
            'ticket_number' => '001',
            'phone' => '0990000001',
            'operation_type' => 'depot',
            'service' => 'bank',
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'waiting',
            'session_id' => $workSession->id,
            'owner_id' => $owner->id,
            'shop_id' => $shop->id,
        ]);

        $payload = [
            'client_id' => $client->id,
            'amount_from' => 100,
            'operation_type' => 'retrait',
            'service' => 'service-falsifie',
            'currency_from' => 'CDF',
            'currency_to' => 'EUR',
        ];

        $this->postJson('/api/transactions', $payload)
            ->assertCreated()
            ->assertJsonPath('operation_type', 'depot')
            ->assertJsonPath('service', 'bank')
            ->assertJsonPath('currency_from', 'USD');

        $this->postJson('/api/transactions', $payload)->assertConflict();
        $this->assertSame(1, Transaction::where('client_id', $client->id)->count());
        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'status' => 'completed',
        ]);
    }

    public function test_manager_cannot_complete_a_ticket_without_a_transaction(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Boutique contrôlée',
            'slug' => 'boutique-controlee',
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shop);
        $client = Client::create([
            'ticket_number' => '001',
            'phone' => '0990000010',
            'operation_type' => 'depot',
            'service' => 'bank',
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'waiting',
            'owner_id' => $owner->id,
            'shop_id' => $shop->id,
        ]);

        $this->actingAs($manager)
            ->putJson("/api/clients/{$client->id}", ['status' => 'completed'])
            ->assertConflict();

        $this->assertSame('waiting', $client->fresh()->status);
    }

    public function test_withdrawal_cannot_overdraw_the_cash_register(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Boutique liquidité',
            'slug' => 'boutique-liquidite',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);
        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 1,
            'name' => 'Guichet liquidité',
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();
        $workSession = Session::create([
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
            'opened_by' => $cashier->id,
            'status' => 'open',
            'session_date' => today(),
            'opened_at' => now(),
        ]);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $counter->id,
            'name' => 'Caisse liquidité',
        ]);
        $cashSession = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'work_session_id' => $workSession->id,
            'status' => 'open',
            'opened_at' => now(),
        ]);
        CashBalance::create([
            'cash_register_id' => $register->id,
            'currency' => 'USD',
            'amount' => 50,
        ]);
        $client = Client::create([
            'ticket_number' => '001',
            'phone' => '0990000020',
            'operation_type' => 'retrait',
            'service' => 'bank',
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'waiting',
            'session_id' => $workSession->id,
            'owner_id' => $owner->id,
            'shop_id' => $shop->id,
        ]);

        $this->actingAs($cashier)
            ->postJson('/api/transactions', [
                'client_id' => $client->id,
                'amount_from' => 100,
            ])
            ->assertUnprocessable();

        $this->assertSame(0, Transaction::where('client_id', $client->id)->count());
        $this->assertSame(0, CashMovement::where('cash_session_id', $cashSession->id)->count());
        $this->assertSame('50.0000', $register->balances()->where('currency', 'USD')->value('amount'));
        $this->assertSame('waiting', $client->fresh()->status);
    }

    public function test_manager_can_record_a_traced_adjustment_only_on_an_open_cash_session(): void
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
            'name' => 'Boutique ajustements',
            'slug' => 'boutique-ajustements',
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shop);
        $cashier->shops()->attach($shop);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'name' => 'Caisse ajustements',
        ]);
        $workSession = Session::create([
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
            'opened_by' => $manager->id,
            'status' => 'open',
            'session_date' => today(),
            'opened_at' => now(),
        ]);
        $cashSession = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'work_session_id' => $workSession->id,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $this->actingAs($manager)
            ->postJson('/api/cash/movements', [
                'cash_session_id' => $cashSession->id,
                'type' => 'adjustment_in',
                'amount' => 25,
                'currency' => 'usd',
                'description' => 'Approvisionnement contrôlé',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('cash_movements', [
            'cash_session_id' => $cashSession->id,
            'user_id' => $manager->id,
            'type' => 'adjustment_in',
            'currency' => 'USD',
            'amount' => 25,
        ]);
        $this->assertDatabaseHas('cashier_activities', [
            'cashier_id' => $manager->id,
            'activity_type' => 'cash_adjustment',
            'session_id' => $workSession->id,
        ]);

        $cashSession->update(['status' => 'closed', 'closed_at' => now()]);

        $this->postJson('/api/cash/movements', [
            'cash_session_id' => $cashSession->id,
            'type' => 'adjustment_in',
            'amount' => 10,
            'currency' => 'USD',
            'description' => 'Tentative tardive',
        ])->assertConflict();

        $this->assertSame(1, CashMovement::where('cash_session_id', $cashSession->id)->count());
        $this->assertSame(
            1,
            CashierActivity::where('cashier_id', $manager->id)
                ->where('activity_type', 'cash_adjustment')
                ->count(),
        );
    }
}
