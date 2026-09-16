<?php

namespace Tests\Feature;

use App\Models\CashBalance;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\Counter;
use App\Models\FlexPayTransaction;
use App\Models\Institution;
use App\Models\Session;
use App\Models\Shop;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FlexPayCollectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.flexpay.base_url' => 'https://flexpay.test',
            'services.flexpay.merchant' => 'HAVIFIN',
            'services.flexpay.token' => 'test-token',
            'services.flexpay.webhook_token' => 'secret-webhook-token',
            'services.flexpay.poll_interval_seconds' => 0,
            'services.flexpay.poll_max_attempts' => 3,
        ]);
    }

    public function test_cashier_can_charge_a_mobile_money_deposit_and_it_completes_on_success(): void
    {
        [$owner, $shop, $cashier, $workSession, $cashSession, $register, $institution] = $this->scenario();

        $ticket = Client::create([
            'ticket_number' => '010',
            'phone' => '0990000010',
            'operation_type' => 'depot',
            'service' => 'M-Pesa',
            'institution_id' => $institution->id,
            'amount' => 50,
            'amount_from' => 50,
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'called',
            'cashier_id' => $cashier->id,
            'session_id' => $workSession->id,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        Http::fake([
            '*paymentService' => Http::response([
                'code' => '0',
                'message' => 'Transaction envoyée avec succès.',
                'orderNumber' => 'ORDER-1',
            ]),
            '*check/ORDER-1' => Http::response([
                'code' => '0',
                'message' => 'Une transaction a été trouvée',
                'transaction' => [
                    'reference' => 'HVF-010',
                    'orderNumber' => 'ORDER-1',
                    'status' => '0',
                    'amount' => '50.0',
                    'amountCustomer' => '50.0',
                    'phone' => '0990000010',
                    'currency' => 'USD',
                    'channel' => 'mpesa',
                ],
            ]),
        ]);

        $this->actingAs($cashier)
            ->postJson("/api/clients/{$ticket->id}/flexpay/charge")
            ->assertStatus(202)
            ->assertJsonPath('status', 'success');

        $flexPayTransaction = FlexPayTransaction::where('client_id', $ticket->id)->firstOrFail();
        $this->assertSame('success', $flexPayTransaction->status);
        $this->assertNotNull($flexPayTransaction->finalized_at);
        $this->assertNotNull($flexPayTransaction->transaction_id);

        $ticket->refresh();
        $this->assertSame('completed', $ticket->status);

        $this->assertSame(1, Transaction::where('client_id', $ticket->id)->count());
        $this->assertSame(1, CashMovement::where('cash_session_id', $cashSession->id)->count());
        $this->assertSame('50.0000', $register->balances()->where('currency', 'USD')->value('amount'));
    }

    public function test_webhook_is_idempotent_alongside_the_polling_job(): void
    {
        [$owner, $shop, $cashier, $workSession, $cashSession, , $institution] = $this->scenario();

        $ticket = Client::create([
            'ticket_number' => '011',
            'phone' => '0990000011',
            'operation_type' => 'depot',
            'service' => 'M-Pesa',
            'institution_id' => $institution->id,
            'amount' => 20,
            'amount_from' => 20,
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'called',
            'cashier_id' => $cashier->id,
            'session_id' => $workSession->id,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        Http::fake([
            '*paymentService' => Http::response([
                'code' => '0',
                'message' => 'ok',
                'orderNumber' => 'ORDER-2',
            ]),
            '*check/ORDER-2' => Http::response([
                'code' => '0',
                'message' => 'ok',
                'transaction' => [
                    'reference' => 'HVF-011',
                    'orderNumber' => 'ORDER-2',
                    'status' => '0',
                    'amount' => '20.0',
                ],
            ]),
        ]);

        $this->actingAs($cashier)
            ->postJson("/api/clients/{$ticket->id}/flexpay/charge")
            ->assertStatus(202);

        $flexPayTransaction = FlexPayTransaction::where('client_id', $ticket->id)->firstOrFail();
        $this->assertSame('success', $flexPayTransaction->status);
        $firstTransactionId = $flexPayTransaction->transaction_id;

        // Webhook arrives after the job already finalized - must not double-credit.
        $this->postJson('/api/flexpay/callback?token=secret-webhook-token', [
            'code' => '0',
            'orderNumber' => 'ORDER-2',
            'reference' => 'HVF-011',
        ])->assertOk();

        $flexPayTransaction->refresh();
        $this->assertSame($firstTransactionId, $flexPayTransaction->transaction_id);
        $this->assertSame(1, Transaction::where('client_id', $ticket->id)->count());
        $this->assertSame(1, CashMovement::where('cash_session_id', $cashSession->id)->count());
    }

    public function test_flexpay_required_blocks_manual_deposit_completion(): void
    {
        [$owner, $shop, $cashier, $workSession, $cashSession, , $institution] = $this->scenario();
        $institution->update(['settings' => ['flexpay_required' => true]]);

        $ticket = Client::create([
            'ticket_number' => '012',
            'phone' => '0990000012',
            'operation_type' => 'depot',
            'service' => 'M-Pesa',
            'institution_id' => $institution->id,
            'amount' => 15,
            'amount_from' => 15,
            'currency_from' => 'USD',
            'currency_to' => 'USD',
            'status' => 'called',
            'cashier_id' => $cashier->id,
            'session_id' => $workSession->id,
            'shop_id' => $shop->id,
            'owner_id' => $owner->id,
        ]);

        $this->actingAs($cashier)
            ->postJson('/api/transactions', ['client_id' => $ticket->id])
            ->assertStatus(409);

        $this->assertSame(0, Transaction::where('client_id', $ticket->id)->count());
        $this->assertSame(0, CashMovement::where('cash_session_id', $cashSession->id)->count());
    }

    /**
     * @return array{User, Shop, User, Session, CashSession, CashRegister, Institution}
     */
    private function scenario(): array
    {
        $owner = User::factory()->create(['role' => 'super-admin']);
        $shop = Shop::create([
            'name' => 'Havifin Mobile Money',
            'slug' => 'havifin-mobile-money',
            'owner_id' => $owner->id,
        ]);

        $cashier = User::factory()->create([
            'role' => 'cashier',
            'owner_id' => $owner->id,
        ]);
        $cashier->shops()->attach($shop);

        $counter = Counter::create([
            'shop_id' => $shop->id,
            'counter_number' => 1,
            'name' => 'Caisse Mobile Money',
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
            'name' => 'Caisse Mobile Money',
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
            'amount' => 0,
        ]);

        $institution = Institution::create([
            'name' => 'M-Pesa',
            'type' => 'mobile_money',
            'code' => 'MPESA',
            'is_active' => true,
            'owner_id' => $owner->id,
        ]);

        return [$owner, $shop, $cashier, $workSession, $cashSession, $register, $institution];
    }
}
