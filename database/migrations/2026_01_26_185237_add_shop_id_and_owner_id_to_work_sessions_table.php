<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('work_sessions', 'shop_id')) {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->foreignId('shop_id')->after('id')->nullable()->constrained('shops')->onDelete('cascade');
            });
        }
        
        if (!Schema::hasColumn('work_sessions', 'owner_id')) {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->foreignId('owner_id')->after('shop_id')->nullable()->constrained('users')->onDelete('cascade');
            });
        }

        try {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->dropUnique(['session_date']);
            });
        } catch (\Exception $e) {
            // Ignore if index doesn't exist or drop fails
        }

        try {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->unique(['shop_id', 'session_date']);
            });
        } catch (\Exception $e) {
            // Ignore if already exists
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->dropUnique(['shop_id', 'session_date']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->unique('session_date');
            });
        } catch (\Exception $e) {}
        
        if (Schema::hasColumn('work_sessions', 'owner_id')) {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->dropConstrainedForeignId('owner_id');
            });
        }
        
        if (Schema::hasColumn('work_sessions', 'shop_id')) {
            Schema::table('work_sessions', function (Blueprint $table) {
                $table->dropConstrainedForeignId('shop_id');
            });
        }
    }
};
