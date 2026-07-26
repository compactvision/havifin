<?php

namespace Tests\Feature;

use App\Models\CashBalance;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\Counter;
use App\Models\ExchangeRate;
use App\Models\Session;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentAndSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_sees_active_payment_institutions_and_can_create_a_payment_ticket(): void
    {
        [$owner, $manager, $client, $shop] = $this->tenantUsersAndShop();

        $this->actingAs($manager)
            ->postJson('/api/institutions', [
                'name' => 'Havifin Pay',
                'type' => 'payment',
                'code' => 'HAVIFIN_PAY',
                'is_active' => true,
            ])
            ->assertCreated();

        $this->actingAs($client)
            ->getJson('/api/institutions/active')
            ->assertOk()
            ->assertJsonFragment([
                'name' => 'Havifin Pay',
                'type' => 'payment',
                'is_active' => true,
            ]);

        Session::create([
            'session_date' => today(),
            'opened_by' => $manager->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $this->postJson('/api/clients', [
            'phone' => '0990000042',
            'operation_type' => 'paiement',
            'service' => 'Havifin Pay',
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'amount' => 25,
        ])
            ->assertCreated()
            ->assertJsonPath('operation_type', 'paiement')
            ->assertJsonPath('service', 'Havifin Pay')
            ->assertJsonPath('amount', '25.00');
    }

    public function test_cashier_can_settle_withdrawals_and_deposits_in_two_currencies(): void
    {
        [$owner, , , $shop] = $this->tenantUsersAndShop();
        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);
        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 1,
            'name' => 'Caisse multidevise',
            'cashier_id' => $cashier->id,
        ]);
        $cashier->forceFill(['counter_id' => $counter->id])->save();

        $workSession = Session::create([
            'session_date' => today(),
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'status' => 'open',
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);
        $register = CashRegister::create([
            'shop_id' => $shop->id,
            'counter_id' => $counter->id,
            'name' => 'Caisse multidevise',
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
            'amount' => 30,
        ]);
        CashBalance::create([
            'cash_register_id' => $register->id,
            'currency' => 'CDF',
            'amount' => 20000,
        ]);
        ExchangeRate::create([
            'currency_pair' => 'USD_CDF',
            'buy_rate' => 2250,
            'sell_rate' => 2250,
            'is_active' => true,
            'owner_id' => $owner->id,
        ]);
        $ticket = Client::create([
            'ticket_number' => '001',
            'phone' => '0990000043',
            'operation_type' => 'retrait',
            'service' => 'Havifin Pay',
            'amount' => 35,
            'amount_from' => 35,
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'waiting',
            'session_id' => $workSession->id,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $response = $this->actingAs($cashier)
            ->postJson('/api/transactions', [
                'client_id' => $ticket->id,
                'settlement' => [
                    'primary_amount' => 30,
                    'secondary_currency' => 'CDF',
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('settlement_breakdown.0.currency', 'USD')
            ->assertJsonPath('settlement_breakdown.0.amount', 30)
            ->assertJsonPath('settlement_breakdown.1.currency', 'CDF')
            ->assertJsonPath('settlement_breakdown.1.amount', 11250)
            ->assertJsonPath('settlement_breakdown.1.exchange_rate', 2250);

        $transaction = Transaction::findOrFail($response->json('id'));
        $this->assertCount(2, $transaction->settlement_breakdown);
        $this->assertSame(2, CashMovement::where('cash_session_id', $cashSession->id)->count());
        $this->assertSame('0.0000', $register->balances()->where('currency', 'USD')->value('amount'));
        $this->assertSame('8750.0000', $register->balances()->where('currency', 'CDF')->value('amount'));

        $depositTicket = Client::create([
            'ticket_number' => '002',
            'phone' => '0990000044',
            'operation_type' => 'depot',
            'service' => 'Havifin Pay',
            'amount' => 35,
            'amount_from' => 35,
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'waiting',
            'session_id' => $workSession->id,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $this->postJson('/api/transactions', [
            'client_id' => $depositTicket->id,
            'settlement' => [
                'primary_amount' => 30,
                'secondary_currency' => 'CDF',
            ],
        ])->assertCreated();

        $this->assertSame(4, CashMovement::where('cash_session_id', $cashSession->id)->count());
        $this->assertSame('30.0000', $register->balances()->where('currency', 'USD')->value('amount'));
        $this->assertSame('20000.0000', $register->balances()->where('currency', 'CDF')->value('amount'));
    }

    /**
     * @return array{User, User, User, Shop}
     */
    private function tenantUsersAndShop(): array
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
            'name' => 'Havifin Paiements',
            'slug' => 'havifin-paiements',
            'owner_id' => $owner->id,
        ]);
        $manager->shops()->attach($shop);
        $client->shops()->attach($shop);

        return [$owner, $manager, $client, $shop];
    }
}
