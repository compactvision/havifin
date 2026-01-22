<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles if they don't exist
        $managerRole = Role::firstOrCreate(['name' => 'manager']);
        $cashierRole = Role::firstOrCreate(['name' => 'cashier']);
        $clientRole = Role::firstOrCreate(['name' => 'client']);
        $superAdminRole = Role::firstOrCreate(['name' => 'super-admin']);

        // Create default manager account
        $manager = User::updateOrCreate(
            ['email' => 'admin@havifin.com'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        $manager->syncRoles([$managerRole]);

        // Create default super-admin account
        $superAdmin = User::updateOrCreate(
            ['email' => 'superadmin@havifin.com'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        $superAdmin->syncRoles([$superAdminRole]);

        // Create a sample cashier account for testing
        $cashier = User::updateOrCreate(
            ['email' => 'cashier@havifin.com'],
            [
                'name' => 'Cashier Demo',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        $cashier->syncRoles([$cashierRole]);

        // Create a sample client account for testing
        $client = User::updateOrCreate(
            ['email' => 'client@havifin.com'],
            [
                'name' => 'Client Demo',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        $client->syncRoles([$clientRole]);
    }
}
