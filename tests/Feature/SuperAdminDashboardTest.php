<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SuperAdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_is_redirected_away_from_operational_screens(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super-admin']);

        $this->actingAs($superAdmin)
            ->get('/manager')
            ->assertRedirect('/admin/shops');

        $this->get('/cashier')->assertRedirect('/admin/shops');
        $this->get('/cash/dashboard')->assertRedirect('/admin/shops');
        $this->get('/display')->assertRedirect('/admin/shops');
        $this->get('/clientform')->assertRedirect('/admin/shops');
    }

    public function test_super_admin_can_create_managers_but_not_cashiers(): void
    {
        Role::findOrCreate('manager', 'web');
        $superAdmin = User::factory()->create(['role' => 'super-admin']);

        $this->actingAs($superAdmin)
            ->postJson('/api/users', [
                'name' => 'Manager Boutique',
                'email' => 'manager@havifin.test',
                'password' => 'MotDePasse!2026',
                'role' => 'manager',
            ])
            ->assertCreated()
            ->assertJsonPath('user.role', 'manager');

        $this->postJson('/api/users', [
            'name' => 'Caissier Interdit',
            'email' => 'cashier@havifin.test',
            'password' => 'MotDePasse!2026',
            'role' => 'cashier',
        ])->assertUnprocessable();
    }

    public function test_shop_dashboard_returns_real_shop_statistics(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super-admin']);
        $this->actingAs($superAdmin);

        $shop = Shop::create([
            'name' => 'Boutique Gombe',
            'slug' => 'boutique-gombe',
            'owner_id' => $superAdmin->id,
            'counter_count' => 3,
        ]);

        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $superAdmin->id,
        ]);
        $shop->users()->attach($manager);

        $completedClient = Client::create([
            'ticket_number' => 'STAT-001',
            'phone' => '0990000001',
            'operation_type' => 'depot',
            'service' => 'M-Pesa',
            'currency_from' => 'USD',
            'currency_to' => 'CDF',
            'status' => 'completed',
            'completed_at' => now(),
            'owner_id' => $superAdmin->id,
            'shop_id' => $shop->id,
        ]);

        Client::create([
            'ticket_number' => 'STAT-002',
            'phone' => '0990000002',
            'operation_type' => 'retrait',
            'service' => 'Orange Money',
            'currency_from' => 'CDF',
            'currency_to' => 'CDF',
            'status' => 'waiting',
            'owner_id' => $superAdmin->id,
            'shop_id' => $shop->id,
        ]);

        Transaction::create([
            'client_id' => $completedClient->id,
            'ticket_number' => $completedClient->ticket_number,
            'operation_type' => $completedClient->operation_type,
            'service' => $completedClient->service,
            'currency_from' => 'USD',
            'currency_to' => 'CDF',
            'amount_from' => 100,
            'amount_to' => 280000,
            'exchange_rate' => 2800,
            'commission' => 2,
            'owner_id' => $superAdmin->id,
            'shop_id' => $shop->id,
        ]);

        $this->getJson("/api/shops/{$shop->id}/statistics")
            ->assertOk()
            ->assertJsonPath('summary.tickets_today', 2)
            ->assertJsonPath('summary.completed_today', 1)
            ->assertJsonPath('summary.waiting_now', 1)
            ->assertJsonPath('summary.transactions_today', 1)
            ->assertJsonPath('summary.completion_rate', 50)
            ->assertJsonPath('summary.managers_count', 1)
            ->assertJsonPath('volumes.0.currency', 'USD')
            ->assertJsonPath('volumes.0.amount', 100);
    }

    public function test_assigning_managers_does_not_remove_operational_staff(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super-admin']);
        $this->actingAs($superAdmin);

        $shop = Shop::create([
            'name' => 'Boutique Limete',
            'slug' => 'boutique-limete',
            'owner_id' => $superAdmin->id,
        ]);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $superAdmin->id,
        ]);
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $superAdmin->id,
        ]);
        $shop->users()->attach($cashier);

        $this->postJson("/api/shops/{$shop->id}/assign-managers", [
            'manager_ids' => [$manager->id],
        ])->assertOk();

        $this->postJson("/api/shops/{$shop->id}/assign-users", [
            'user_ids' => [$cashier->id],
        ])->assertForbidden();

        $this->postJson("/api/shops/{$shop->id}/counters", [
            'counter_number' => 1,
            'name' => 'Guichet interdit',
        ])->assertForbidden();

        $this->assertTrue($shop->users()->whereKey($manager->id)->exists());
        $this->assertTrue($shop->users()->whereKey($cashier->id)->exists());
    }
}
