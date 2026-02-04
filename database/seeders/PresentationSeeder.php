<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Shop;
use App\Models\Session;
use App\Models\Client;
use App\Models\CashMovement;
use App\Models\CashierActivity;
use App\Models\Institution;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Spatie\Permission\Models\Role;

class PresentationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure basic data exists (Users, Shops, Institutions)
        $this->call([
            UserSeeder::class,
        ]);

        $manager = User::where('email', 'manager1@havifin.com')->first();
        if (!$manager) {
            $this->command->error("Base data missing.");
            return;
        }

        // Create specific institutions for Demo
        $demoInstitutions = [
            ['code' => 'CANAL', 'name' => 'Canal+', 'type' => 'payment', 'is_active' => true],
            ['code' => 'SNEL', 'name' => 'SNEL', 'type' => 'payment', 'is_active' => true],
            ['code' => 'REGIDESO', 'name' => 'Regideso', 'type' => 'payment', 'is_active' => true],
            ['code' => 'STARTIMES', 'name' => 'Startimes', 'type' => 'payment', 'is_active' => true],
            ['code' => 'MPESA', 'name' => 'M-Pesa', 'type' => 'mobile_money', 'is_active' => true],
            ['code' => 'ORANGE', 'name' => 'Orange Money', 'type' => 'mobile_money', 'is_active' => true],
            ['code' => 'AIRTEL', 'name' => 'Airtel Money', 'type' => 'mobile_money', 'is_active' => true],
            ['code' => 'EQUITY', 'name' => 'Equity BCDC', 'type' => 'bank', 'is_active' => true],
            ['code' => 'RAWBANK', 'name' => 'Rawbank', 'type' => 'bank', 'is_active' => true],
        ];

        foreach ($demoInstitutions as $inst) {
            Institution::updateOrCreate(
                ['code' => $inst['code']],
                array_merge($inst, ['owner_id' => $manager->owner_id])
            );
        }

        $cashier = User::where('email', 'cashier1@havifin.com')->first();
        $shop = Shop::where('slug', 'havifin-gombe')->first();

        // 2. Create Clients
        $this->command->info('Creating Clients...');
        
        // Add some realistic clients manually
        $realisticClients = [
            ['first_name' => 'Jean', 'last_name' => 'Kabuya', 'phone' => '0810001001', 'id_card_number' => 'CHK123456'],
            ['first_name' => 'Marie', 'last_name' => 'Mulumba', 'phone' => '0820002002', 'id_card_number' => 'CHK789012'],
            ['first_name' => 'Pierre', 'last_name' => 'Tshimanga', 'phone' => '0990003003', 'id_card_number' => 'CHK345678'],
            ['first_name' => 'Therese', 'last_name' => 'Kasongo', 'phone' => '0970004004', 'id_card_number' => 'CHK901234'],
            ['first_name' => 'Paul', 'last_name' => 'Mbuyi', 'phone' => '0850005005', 'id_card_number' => 'CHK567890'],
            ['first_name' => 'Sophie', 'last_name' => 'Kalala', 'phone' => '0890006006', 'id_card_number' => 'CHK123789'],
            ['first_name' => 'Michel', 'last_name' => 'Ngoy', 'phone' => '0840007007', 'id_card_number' => 'CHK987654'],
             ['first_name' => 'David', 'last_name' => 'Mukendi', 'phone' => '0810008008', 'id_card_number' => 'CHK456123'],
        ];

        foreach ($realisticClients as $clientData) {
            $idCard = $clientData['id_card_number'];
            unset($clientData['id_card_number']); // Remove from top level

            Client::firstOrCreate(
                ['phone' => $clientData['phone']],
                array_merge($clientData, [
                    'owner_id' => $manager->owner_id, 
                    'is_registered' => true,
                    'metadata' => ['id_card_number' => $idCard]
                ])
            );
        }
        
        // Create 10 more random clients
        for($i=0; $i<10; $i++) {
             Client::firstOrCreate(
                ['phone' => '0800099' . str_pad($i, 3, '0', STR_PAD_LEFT)],
                [
                    'first_name' => 'Client',
                    'last_name' => 'Demo ' . $i,
                    'metadata' => ['id_card_number' => 'RD-' . rand(10000, 99999)],
                    'owner_id' => $manager->owner_id,
                    'is_registered' => true
                ]
            );
        }

        $clients = Client::all();

        // 2.1 Create Cash Register for the Shop
        $this->command->info('Creating Cash Register...');
        $cashRegister = \App\Models\CashRegister::firstOrCreate(
            ['name' => 'Caisse Principale', 'shop_id' => $shop->id],
            [
                'status' => 'open',
                'currency' => 'USD',
                'balance' => 0,
                'owner_id' => $manager->owner_id,
            ]
        );

        // 3. Create Session History (Past 3 days)
        $this->command->info('Creating Session History...');
        
        $institutions = Institution::active()->get();

        for ($i = 3; $i >= 1; $i--) {
            $date = Carbon::now()->subDays($i);
            
            // Create a closed session for this day
            $session = Session::firstOrCreate(
                [
                    'session_date' => $date->toDateString(),
                    'owner_id' => $manager->owner_id,
                ],
                [
                    'shop_id' => $shop->id,
                    'opened_by' => $cashier->id,
                    'closed_by' => $cashier->id,
                    'opened_at' => $date->copy()->setHour(8)->setMinute(0),
                    'closed_at' => $date->copy()->setHour(17)->setMinute(30),
                    'status' => 'closed',
                ]
            );

            // Create Cash Session
            $cashSession = \App\Models\CashSession::firstOrCreate(
                [
                    'work_session_id' => $session->id,
                    'user_id' => $cashier->id,
                ],
                [
                    'cash_register_id' => $cashRegister->id,
                    'opened_at' => $session->opened_at,
                    'closed_at' => $session->closed_at,
                    'status' => 'closed',
                    'owner_id' => $manager->owner_id,
                ]
            );

            // Add Transactions for this session (Pass cashSession)
            if ($cashSession->wasRecentlyCreated) {
                $this->createRandomTransactions($session, $cashSession, $clients, $institutions, $date);
                
                // Log Login/Logout for history
                CashierActivity::create([
                    'cashier_id' => $cashier->id,
                    'session_id' => $session->id,
                    'activity_type' => 'login',
                    'description' => 'Connexion utilisateur: ' . $cashier->name,
                    'created_at' => $session->opened_at,
                ]);
                CashierActivity::create([
                    'cashier_id' => $cashier->id,
                    'session_id' => $session->id,
                    'activity_type' => 'logout',
                    'description' => 'Déconnexion utilisateur: ' . $cashier->name,
                    'created_at' => $session->closed_at,
                ]);
            }
        }

        // 4. Create Today's ACTIVE Session
        $this->command->info('Creating Active Session...');
        $todaySession = Session::firstOrCreate(
            [
                'session_date' => Carbon::now()->toDateString(),
                'owner_id' => $manager->owner_id,
            ],
            [
                'shop_id' => $shop->id,
                'opened_by' => $cashier->id,
                'opened_at' => Carbon::now()->subHours(2), // Opened 2 hours ago
                'status' => 'open',
            ]
        );

        $todayCashSession = \App\Models\CashSession::firstOrCreate(
            [
                'work_session_id' => $todaySession->id,
                'user_id' => $cashier->id,
            ],
            [
                'cash_register_id' => $cashRegister->id,
                'opened_at' => $todaySession->opened_at,
                'status' => 'open',
                'owner_id' => $manager->owner_id,
            ]
        );

        if ($todayCashSession->wasRecentlyCreated) {
            CashierActivity::create([
                'cashier_id' => $cashier->id,
                'session_id' => null, // Login happened before session start logic usually, or just associate it
                'activity_type' => 'login',
                'description' => 'Connexion utilisateur: ' . $cashier->name,
                'created_at' => Carbon::now()->subHours(2)->subMinutes(5),
            ]);

            CashierActivity::create([
                'cashier_id' => $cashier->id,
                'session_id' => $todaySession->id,
                'activity_type' => 'login', // Maybe they re-logged or it's just the start event
                'description' => 'Ouverture de session #' . $todaySession->id,
                'created_at' => $todaySession->opened_at,
            ]);

            // Add some transactions for today
            $this->createRandomTransactions($todaySession, $todayCashSession, $clients, $institutions, Carbon::now(), 5);
        }

        $this->command->info('Presentation Seeds Completed!');
    }

    private function createRandomTransactions($workSession, $cashSession, $clients, $institutions, $date, $count = 20)
    {
        $currencies = ['USD', 'CDF'];
        $services = $institutions->where('type', 'payment');
        $mobileMoney = $institutions->where('type', 'mobile_money');
        $banks = $institutions->where('type', 'bank');

        for ($k = 0; $k < $count; $k++) {
            // Determine transaction scenario
            $scenario = rand(1, 100);
            $type = 'deposit'; // Default
            $institution = null;
            $description = "";

            if ($scenario <= 30) {
                // Bill Payment (Canal+, SNEL, etc.) -> Withdrawal
                $type = 'withdrawal';
                if ($services->count() > 0) {
                    $institution = $services->random();
                    $description = "Paiement Facture " . $institution->name;
                }
            } elseif ($scenario <= 60) {
                // Mobile Money / Bank Deposit/Withdrawal
                $type = rand(0, 1) ? 'deposit' : 'withdrawal';
                $pool = rand(0, 1) && $banks->count() > 0 ? $banks : $mobileMoney;
                if ($pool->count() > 0) {
                    $institution = $pool->random();
                    $description = ($type == 'deposit' ? 'Dépôt' : 'Retrait') . " " . $institution->name;
                }
            } else {
                // Exchange
                $type = rand(0, 1) ? 'exchange_in' : 'exchange_out';
                $description = "Change Espèces";
                $institution = $institutions->random(); // Just for context if needed, or null
            }
            
            // Fallback description if institution missing (though logic above tries to set it)
            if (!$institution) {
                $institution = $institutions->random(); 
                if ($type == 'withdrawal' && empty($description)) $description = "Retrait divers";
                if ($type == 'deposit' && empty($description)) $description = "Dépôt divers";
            }

            $amount = rand(10, 500) * ($currencies[array_rand($currencies)] == 'CDF' ? 2800 : 1);
            $currency = $amount > 10000 ? 'CDF' : 'USD';
            
            $client = $clients->random();
            $txTime = $date->copy()->setHour(rand(8, 17))->setMinute(rand(0, 59));

            // Create Movement
            $movement = CashMovement::create([
                'cash_session_id' => $cashSession->id,
                'user_id' => $cashSession->user_id,
                'type' => $type,
                'amount' => $amount,
                'currency' => $currency,
                'description' => $description,
                'created_at' => $txTime,
                'owner_id' => $workSession->owner_id,
            ]);

            // Create Activity Log
            CashierActivity::create([
                'cashier_id' => $workSession->opened_by,
                'session_id' => $workSession->id,
                'activity_type' => 'complete_transaction',
                'client_id' => $client->id,
                'description' => "Transaction: {$description} {$amount} {$currency} ({$client->first_name})",
                'created_at' => $txTime,
            ]);
        }
    }
}
