<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstitutionConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_institution_settings()
    {
        $user = User::factory()->create(['role' => 'super-admin']);
        $institution = Institution::create([
            'name' => 'Test Bank',
            'type' => 'bank',
            'code' => 'test_bank',
            'is_active' => true,
            'owner_id' => $user->id,
        ]);

        $settings = ['required_fields' => ['account_number', 'beneficiary']];

        $response = $this->actingAs($user)
            ->putJson("/api/institutions/{$institution->id}", [
                'settings' => $settings,
            ]);

        $response->assertStatus(200);
        $this->assertEquals($settings, $institution->fresh()->settings);
    }

    public function test_unauthenticated_cannot_update_settings()
    {
        $user = User::factory()->create();
        $institution = Institution::create([
            'name' => 'Test Bank',
            'type' => 'bank',
            'code' => 'test_bank_2',
            'owner_id' => $user->id,
        ]);

        $response = $this->putJson("/api/institutions/{$institution->id}", [
            'settings' => ['required_fields' => ['account_number']],
        ]);

        $response->assertStatus(401);
    }
}
