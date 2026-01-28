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

        // ==========================================
        // SUPER ADMIN 1 ENVIRONMENT
        // ==========================================
        $sa1 = User::updateOrCreate(
            ['email' => 'superadmin1@havifin.com'],
            [
                'name' => 'Super Admin 1',
                'password' => Hash::make('password'),
                'is_active' => true,
                'role' => 'super-admin',
            ]
        );
        $sa1->syncRoles([$superAdminRole]);

        // SA1 Shop
        $shop1 = \App\Models\Shop::create([
            'name' => 'Havifin Gombe',
            'slug' => 'havifin-gombe',
            'address' => 'Boulevard du 30 Juin, Kinshasa/Gombe',
            'counter_count' => 3,
            'is_active' => true,
            'owner_id' => $sa1->id,
        ]);

        // SA1 Manager
        $manager1 = User::create([
            'name' => 'Manager SA1',
            'email' => 'manager1@havifin.com',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'is_active' => true,
            'owner_id' => $sa1->id,
        ]);
        $manager1->syncRoles([$managerRole]);
        $manager1->shops()->attach($shop1->id);

        // SA1 Cashier
        $cashier1 = User::create([
            'name' => 'Cashier SA1',
            'email' => 'cashier1@havifin.com',
            'password' => Hash::make('password'),
            'role' => 'cashier',
            'is_active' => true,
            'owner_id' => $sa1->id,
        ]);
        $cashier1->syncRoles([$cashierRole]);
        $cashier1->shops()->attach($shop1->id);

        // SA1 Advertisement
        \App\Models\Advertisement::create([
            'title' => 'Promo SA1',
            'image_url' => 'https://placehold.co/1920x1080/0000FF/808080?text=Promo+SA1',
            'is_active' => true,
            'owner_id' => $sa1->id,
        ]);

        // ==========================================
        // SUPER ADMIN 2 ENVIRONMENT
        // ==========================================
        $sa2 = User::updateOrCreate(
            ['email' => 'superadmin2@havifin.com'],
            [
                'name' => 'Super Admin 2',
                'password' => Hash::make('password'),
                'is_active' => true,
                'role' => 'super-admin',
            ]
        );
        $sa2->syncRoles([$superAdminRole]);

        // SA2 Shop
        $shop2 = \App\Models\Shop::create([
            'name' => 'Havifin Limete',
            'slug' => 'havifin-limete',
            'address' => 'Boulevard Lumumba, Kinshasa/Limete',
            'counter_count' => 5,
            'is_active' => true,
            'owner_id' => $sa2->id,
        ]);

        // SA2 Manager
        $manager2 = User::create([
            'name' => 'Manager SA2',
            'email' => 'manager2@havifin.com',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'is_active' => true,
            'owner_id' => $sa2->id,
        ]);
        $manager2->syncRoles([$managerRole]);
        $manager2->shops()->attach($shop2->id);

        // SA2 Advertisement
        \App\Models\Advertisement::create([
            'title' => 'Promo SA2',
            'image_url' => 'https://placehold.co/1920x1080/FF0000/FFFFFF?text=Promo+SA2',
            'is_active' => true,
            'owner_id' => $sa2->id,
        ]);
    }
}
