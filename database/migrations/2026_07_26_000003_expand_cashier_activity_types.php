<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store activity types as extensible application events instead of a
     * database enum that must be altered for every new audit event.
     */
    public function up(): void
    {
        Schema::table('cashier_activities', function (Blueprint $table) {
            $table->string('activity_type', 64)->change();
        });
    }

    public function down(): void
    {
        $legacyTypes = [
            'login',
            'logout',
            'call_client',
            'complete_transaction',
            'help_request',
            'recall_client',
        ];

        DB::table('cashier_activities')
            ->whereNotIn('activity_type', $legacyTypes)
            ->update(['activity_type' => 'complete_transaction']);

        Schema::table('cashier_activities', function (Blueprint $table) use ($legacyTypes) {
            $table->enum('activity_type', $legacyTypes)->change();
        });
    }
};
