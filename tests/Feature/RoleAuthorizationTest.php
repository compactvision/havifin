<?php

namespace Tests\Feature;

use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Counter;
use App\Models\Session;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_role_is_redirected_to_its_own_workspace(): void
    {
        $destinations = [
            'super-admin' => '/admin/shops',
            'manager' => '/manager',
            'cashier' => '/cashier/today',
            'client' => '/clientform',
        ];

        foreach ($destinations as $role => $destination) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user)
                ->get('/login')
                ->assertRedirect($destination);

            auth()->logout();
        }
    }

    public function test_super_admin_is_limited_to_shops_managers_and_statistics(): void
    {
        Role::findOrCreate('manager', 'web');
        $superAdmin = User::factory()->create(['role' => 'super-admin']);

        $this->actingAs($superAdmin);

        $this->getJson('/api/transactions')->assertForbidden();
        $this->getJson('/api/clients')->assertForbidden();
        $this->getJson('/api/cash/registers')->assertForbidden();
        $this->getJson('/api/sessions/current')->assertForbidden();
        $this->getJson('/api/institutions')->assertForbidden();
        $this->postJson('/api/exchange-rates', [])->assertForbidden();

        $this->postJson('/api/users', [
            'name' => 'Manager autorisé',
            'email' => 'manager.authorized@havifin.test',
            'password' => 'MotDePasse!2026',
            'role' => 'manager',
        ])->assertCreated();

        $shop = $this->createShop($superAdmin);
        $this->getJson("/api/shops/{$shop->id}/statistics")->assertOk();
    }

    public function test_manager_can_run_shop_operations_but_not_super_admin_actions(): void
    {
        Role::findOrCreate('cashier', 'web');
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $shop = $this->createShop($owner);
        $manager->shops()->attach($shop);

        $this->actingAs($manager);

        $this->postJson('/api/shops', [])->assertForbidden();
        $this->deleteJson("/api/shops/{$shop->id}")->assertForbidden();
        $this->getJson("/api/shops/{$shop->id}/statistics")->assertForbidden();
        $this->postJson("/api/shops/{$shop->id}/assign-managers", [])->assertForbidden();
        $this->postJson('/api/transactions', [])->assertForbidden();
        $this->get('/cashier')->assertRedirect('/manager');

        $this->postJson('/api/users', [
            'name' => 'Caissier autorisé',
            'email' => 'cashier.authorized@havifin.test',
            'password' => 'MotDePasse!2026',
            'role' => 'cashier',
        ])->assertCreated();

        $this->postJson('/api/sessions', [
            'session_date' => today()->toDateString(),
            'shop_id' => $shop->id,
        ])->assertCreated();

        $this->putJson("/api/shops/{$shop->id}", [
            'address' => 'Nouvelle adresse opérationnelle',
        ])->assertOk();
        $this->assertDatabaseHas('shops', [
            'id' => $shop->id,
            'address' => 'Nouvelle adresse opérationnelle',
        ]);
    }

    public function test_manager_cannot_manage_another_manager_or_shared_out_of_scope_staff(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $otherManager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $managedShop = $this->createShop($owner, 'managed-shop');
        $outsideShop = $this->createShop($owner, 'outside-shop');
        $manager->shops()->attach($managedShop);
        $otherManager->shops()->attach($managedShop);

        $sharedCashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $sharedCashier->shops()->attach([$managedShop->id, $outsideShop->id]);

        $this->actingAs($manager)
            ->putJson("/api/users/{$otherManager->id}", ['is_active' => false])
            ->assertForbidden();

        $this->putJson("/api/users/{$sharedCashier->id}", ['is_active' => false])
            ->assertForbidden();
    }

    public function test_manager_without_an_owner_fails_closed(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super-admin']);
        $misconfiguredManager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => null,
        ]);

        $response = $this->actingAs($misconfiguredManager)->getJson('/api/users');

        $response->assertOk();
        $this->assertNotContains($superAdmin->id, collect($response->json())->pluck('id'));
        $this->postJson('/api/users', [
            'name' => 'Compte interdit',
            'email' => 'no-owner@havifin.test',
            'password' => 'MotDePasse!2026',
            'role' => 'cashier',
        ])->assertForbidden();
    }

    public function test_cashier_cannot_manage_configuration_or_other_cashiers_sessions(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $shop = $this->createShop($owner);
        $cashier = $this->createCashierWithCounter($owner, $shop, 1);
        $otherCashier = $this->createCashierWithCounter($owner, $shop, 2);
        $otherRegister = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $otherCashier->counter_id,
            'name' => 'Caisse 2',
        ]);
        $otherSession = CashSession::create([
            'cash_register_id' => $otherRegister->id,
            'user_id' => $otherCashier->id,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $this->actingAs($cashier);

        $this->getJson('/api/users')->assertForbidden();
        $this->postJson('/api/exchange-rates', [])->assertForbidden();
        $this->getJson('/api/sessions')->assertForbidden();
        $this->postJson('/api/institutions', [])->assertForbidden();
        $this->getJson('/api/shops')
            ->assertOk()
            ->assertJsonMissingPath('0.users');
        $this->getJson("/api/cash/sessions/{$otherSession->id}")->assertForbidden();
        $this->postJson("/api/cash/sessions/{$otherSession->id}/close", [
            'closing_amounts' => ['USD' => 0],
        ])->assertForbidden();
    }

    public function test_client_role_only_has_access_to_the_kiosk_capabilities(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $shop = $this->createShop($owner);
        $client = User::factory()->create([
            'role' => 'client',
            'owner_id' => $owner->id,
        ]);
        $client->shops()->attach($shop);

        $this->actingAs($client);

        $this->getJson('/api/clients')->assertForbidden();
        $this->getJson('/api/transactions')->assertForbidden();
        $this->getJson('/api/cash/registers')->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/exchange-rates')->assertOk();
        $this->postJson('/api/clients/add-phone', [
            'client_id' => 1,
            'phone_number' => '0990000000',
        ])->assertForbidden();
        $this->get('/display')->assertRedirect('/clientform');
    }

    public function test_counter_assignment_keeps_user_and_counter_relations_in_sync(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $shop = $this->createShop($owner);
        $manager->shops()->attach($shop);
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);

        $counterId = $this->actingAs($manager)
            ->postJson("/api/shops/{$shop->id}/counters", [
                'counter_number' => 1,
                'name' => 'Guichet synchronisé',
                'cashier_id' => $cashier->id,
            ])
            ->assertCreated()
            ->json('id');

        $this->assertSame($counterId, $cashier->fresh()->counter_id);
        $this->assertDatabaseHas('cash_registers', [
            'shop_id' => $shop->id,
            'counter_id' => $counterId,
            'name' => 'Caisse Guichet synchronisé',
        ]);

        $this->putJson("/api/counters/{$counterId}", ['cashier_id' => null])
            ->assertOk();

        $this->assertNull($cashier->fresh()->counter_id);
    }

    public function test_manager_can_reopen_only_a_session_from_an_assigned_shop(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $assignedShop = $this->createShop($owner, 'assigned-shop');
        $otherShop = $this->createShop($owner, 'other-shop');
        $manager->shops()->attach($assignedShop);

        $assignedSession = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now()->subHour(),
            'closed_at' => now(),
            'status' => 'closed',
            'shop_id' => $assignedShop->id,
            'owner_id' => $owner->id,
        ]);
        $otherSession = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now()->subHour(),
            'closed_at' => now(),
            'status' => 'closed',
            'shop_id' => $otherShop->id,
            'owner_id' => $owner->id,
        ]);
        $yesterdaySession = Session::create([
            'session_date' => today()->subDay(),
            'opened_by' => $manager->id,
            'opened_at' => now()->subDay()->subHour(),
            'closed_at' => now()->subDay(),
            'status' => 'closed',
            'shop_id' => $assignedShop->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($manager)
            ->postJson("/api/sessions/{$yesterdaySession->id}/reopen")
            ->assertConflict()
            ->assertJsonPath('message', 'Seule une session du jour peut être réouverte.');
        $this->assertSame('closed', $yesterdaySession->fresh()->status);

        $this->postJson("/api/sessions/{$assignedSession->id}/reopen")
            ->assertOk()
            ->assertJsonPath('status', 'open');

        $this->postJson("/api/sessions/{$otherSession->id}/reopen")
            ->assertForbidden();
    }

    public function test_work_session_cannot_close_while_a_till_is_open(): void
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $shop = $this->createShop($owner);
        $manager->shops()->attach($shop);
        $cashier = $this->createCashierWithCounter($owner, $shop, 1);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $cashier->counter_id,
            'name' => 'Caisse principale',
        ]);
        $workSession = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);
        $cashSession = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'work_session_id' => $workSession->id,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $this->actingAs($manager)
            ->postJson("/api/sessions/{$workSession->id}/close")
            ->assertConflict();

        $this->postJson("/api/cash/sessions/{$cashSession->id}/close", [
            'closing_amounts' => ['USD' => 0],
        ])->assertOk();

        $this->postJson("/api/sessions/{$workSession->id}/close")
            ->assertOk()
            ->assertJsonPath('status', 'closed');
    }

    private function createShop(User $owner, string $slug = 'shop'): Shop
    {
        return Shop::create([
            'name' => str($slug)->headline(),
            'slug' => $slug,
            'owner_id' => $owner->id,
        ]);
    }

    private function createCashierWithCounter(User $owner, Shop $shop, int $number): User
    {
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);
        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => $number,
            'name' => "Guichet {$number}",
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();

        return $cashier->fresh();
    }
}
