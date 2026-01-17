<?php

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $institutions = [
            // Mobile Money
            [
                'name' => 'M-Pesa',
                'type' => 'mobile_money',
                'code' => 'mpesa',
                'is_active' => true,
            ],
            [
                'name' => 'Orange Money',
                'type' => 'mobile_money',
                'code' => 'orange_money',
                'is_active' => true,
            ],
            [
                'name' => 'Airtel Money',
                'type' => 'mobile_money',
                'code' => 'airtel_money',
                'is_active' => true,
            ],
            [
                'name' => 'Afrimoney',
                'type' => 'mobile_money',
                'code' => 'afrimoney',
                'is_active' => true,
            ],
            // Banks
            [
                'name' => 'Rawbank',
                'type' => 'bank',
                'code' => 'rawbank',
                'is_active' => true,
            ],
            [
                'name' => 'Equity BCDC',
                'type' => 'bank',
                'code' => 'equity_bcdc',
                'is_active' => true,
            ],
            [
                'name' => 'TMB',
                'type' => 'bank',
                'code' => 'tmb',
                'is_active' => true,
            ],
            [
                'name' => 'FBN Bank',
                'type' => 'bank',
                'code' => 'fbn_bank',
                'is_active' => true,
            ],
            // Others
            [
                'name' => 'Western Union',
                'type' => 'other',
                'code' => 'western_union',
                'is_active' => true,
            ],
            [
                'name' => 'Ria',
                'type' => 'other',
                'code' => 'ria',
                'is_active' => true,
            ],
            [
                'name' => 'MoneyGram',
                'type' => 'other',
                'code' => 'moneygram',
                'is_active' => true,
            ],
        ];

        foreach ($institutions as $institution) {
            Institution::updateOrCreate(['code' => $institution['code']], $institution);
        }
    }
}
