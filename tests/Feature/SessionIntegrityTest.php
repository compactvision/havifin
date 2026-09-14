<?php

namespace Tests\Feature;

use App\Models\CashBalance;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\CashSessionAmount;
use App\Models\Counter;
use App\Models\Session;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_cannot_open_a_work_session_dated_in_the_past(): void
    {
        [$manager, $shop] = $this->managerWithShop();

        $this->actingAs($manager)
            ->postJson('/api/sessions', [
                'session_date' => today()->subDay()->toDateString(),
                'shop_id' => $shop->id,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Validation failed')
            ->assertJsonStructure(['messages' => ['session_date']]);

        $this->assertDatabaseMissing('work_sessions', [
            'shop_id' => $shop->id,
            'session_date' => today()->subDay()->toDateString(),
        ]);
    }

    public function test_opening_a_till_fails_when_the_work_session_was_just_closed(): void
    {
        [$manager, $shop] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        $cashier = $this->createCashierWithCounter($owner, $shop);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $cashier->counter_id,
            'name' => 'Caisse race',
        ]);
        $workSession = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($manager)
            ->postJson("/api/sessions/{$workSession->id}/close")
            ->assertOk();

        $this->actingAs($cashier)
            ->postJson('/api/cash/sessions', [
                'cash_register_id' => $register->id,
                'opening_amounts' => ['USD' => 50],
            ])
            ->assertConflict();
    }

    public function test_stale_close_marks_tills_force_closed_without_zero_difference(): void
    {
        [$manager, $shop] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        $cashier = $this->createCashierWithCounter($owner, $shop);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $cashier->counter_id,
            'name' => 'Caisse stale',
        ]);
        $workSession = Session::create([
            'session_date' => today()->subDay(),
            'opened_by' => $manager->id,
            'opened_at' => now()->subDay(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);
        $cashSession = CashSession::create([
            'cash_register_id' => $register->id,
            'user_id' => $cashier->id,
            'work_session_id' => $workSession->id,
            'status' => 'open',
            'opened_at' => now()->subDay(),
            'owner_id' => $owner->id,
        ]);
        CashSessionAmount::create([
            'cash_session_id' => $cashSession->id,
            'currency' => 'USD',
            'opening_amount' => 100,
            'owner_id' => $owner->id,
        ]);
        CashBalance::create([
            'cash_register_id' => $register->id,
            'currency' => 'USD',
            'amount' => 100,
            'owner_id' => $owner->id,
        ]);

        $this->artisan('sessions:close-stale')->assertSuccessful();

        $cashSession->refresh();
        $amount = $cashSession->amounts()->first();
        $workSession->refresh();

        $this->assertSame('closed', $cashSession->status);
        $this->assertTrue($cashSession->force_closed);
        $this->assertNull($cashSession->closed_by);
        $this->assertNull($amount->closing_amount_real);
        $this->assertNull($amount->difference);
        $this->assertEquals(100, (float) $amount->closing_amount_theoretical);
        $this->assertSame('closed', $workSession->status);
        $this->assertTrue($workSession->force_closed);
    }

    public function test_listing_sessions_for_a_date_defaults_to_a_wide_page(): void
    {
        [$manager, $shop] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);

        for ($i = 0; $i < 16; $i++) {
            $extraShop = Shop::create([
                'name' => "Shop {$i}",
                'slug' => "shop-{$i}-".uniqid(),
                'owner_id' => $owner->id,
            ]);
            $manager->shops()->attach($extraShop);
            Session::create([
                'session_date' => today(),
                'opened_by' => $manager->id,
                'opened_at' => now(),
                'status' => 'open',
                'shop_id' => $extraShop->id,
                'owner_id' => $owner->id,
            ]);
        }

        Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'closed',
            'closed_at' => now(),
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $response = $this->actingAs($manager)
            ->getJson('/api/sessions?date='.today()->toDateString())
            ->assertOk();

        $this->assertSame(100, $response->json('per_page'));
        $this->assertSame(17, $response->json('total'));
        $this->assertCount(17, $response->json('data'));
    }

    public function test_reopening_today_closed_session_via_api_returns_open(): void
    {
        [$manager, $shop] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        $session = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now()->subHour(),
            'closed_at' => now(),
            'status' => 'closed',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($manager)
            ->postJson("/api/sessions/{$session->id}/reopen")
            ->assertOk()
            ->assertJsonPath('status', 'open');
    }

    public function test_inactive_shop_cannot_open_day_or_till(): void
    {
        [$manager, $shop] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        $shop->update(['is_active' => false]);
        $cashier = $this->createCashierWithCounter($owner, $shop);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $cashier->counter_id,
            'name' => 'Caisse inactive shop',
        ]);

        $this->actingAs($manager)
            ->postJson('/api/sessions', [
                'session_date' => today()->toDateString(),
                'shop_id' => $shop->id,
            ])
            ->assertConflict();

        $shop->update(['is_active' => true]);
        $workSession = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);
        $shop->update(['is_active' => false]);

        $this->actingAs($cashier)
            ->postJson('/api/cash/sessions', [
                'cash_register_id' => $register->id,
                'opening_amounts' => ['USD' => 10],
            ])
            ->assertConflict();

        $this->assertDatabaseMissing('cash_sessions', [
            'work_session_id' => $workSession->id,
        ]);
    }

    public function test_manager_cannot_open_till_without_assigned_cashier(): void
    {
        [$manager, $shop] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);
        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 9,
            'name' => 'Guichet vide',
            'cashier_id' => null,
        ]);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $counter->id,
            'name' => 'Caisse sans caissier',
        ]);

        $this->actingAs($manager)
            ->postJson('/api/cash/sessions', [
                'cash_register_id' => $register->id,
                'opening_amounts' => ['USD' => 20],
            ])
            ->assertConflict();
    }

    public function test_multi_shop_cashier_uses_counter_shop_for_current_session(): void
    {
        [$manager, $shopA] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        $shopB = Shop::create([
            'name' => 'Shop B',
            'slug' => 'shop-b-'.uniqid(),
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shopB);

        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        // Pivot order puts A first; counter is on B — resolve must use B.
        $cashier->shops()->attach([$shopA->id, $shopB->id]);
        $counter = Counter::create([
            'shop_id' => $shopB->id,
            'counter_number' => 1,
            'name' => 'Guichet B',
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();

        $sessionA = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shopA->id,
            'owner_id' => $owner->id,
        ]);
        $sessionB = Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shopB->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($cashier)
            ->getJson('/api/sessions/current')
            ->assertOk()
            ->assertJsonPath('id', $sessionB->id)
            ->assertJsonPath('shop_id', $shopB->id);

        $this->assertNotSame($sessionA->id, $sessionB->id);
    }

    public function test_multi_shop_user_without_counter_must_pass_shop_id(): void
    {
        [$manager] = $this->managerWithShop();
        $owner = User::find($manager->owner_id);
        $shopB = Shop::create([
            'name' => 'Shop Extra',
            'slug' => 'shop-extra-'.uniqid(),
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shopB);

        $this->actingAs($manager)
            ->getJson('/api/sessions/current')
            ->assertStatus(422);
    }

    /**
     * @return array{0: User, 1: Shop}
     */
    private function managerWithShop(): array
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $manager = User::factory()->create([
            'role' => 'manager',
            'owner_id' => $owner->id,
        ]);
        $shop = Shop::create([
            'name' => 'Shop Integrity',
            'slug' => 'shop-integrity-'.uniqid(),
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shop);

        return [$manager, $shop];
    }

    private function createCashierWithCounter(User $owner, Shop $shop): User
    {
        $cashier = User::factory()->create([
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

        return $cashier;
    }
}
