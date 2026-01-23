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
        // 1. Optimize transactions table
        Schema::table('transactions', function (Blueprint $table) {
            $table->index('ticket_number');
            $table->index('created_at');
            $table->index(['owner_id', 'shop_id', 'created_at'], 'idx_transactions_performance');
        });

        // 2. Optimize clients table
        Schema::table('clients', function (Blueprint $table) {
            $table->index('phone');
            $table->index(['phone', 'owner_id']);
        });

        // 3. Fix work_sessions for multi-tenancy
        Schema::table('work_sessions', function (Blueprint $table) {
            $table->dropUnique(['session_date']);
            $table->unique(['session_date', 'owner_id']);
        });

        // 4. Optimize client_phones
        Schema::table('client_phones', function (Blueprint $table) {
            $table->index('phone_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['ticket_number']);
            $table->dropIndex(['created_at']);
            $table->dropIndex('idx_transactions_performance');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['phone']);
            $table->dropIndex(['phone', 'owner_id']);
        });

        Schema::table('work_sessions', function (Blueprint $table) {
            $table->dropUnique(['session_date', 'owner_id']);
            $table->unique(['session_date']);
        });

        Schema::table('client_phones', function (Blueprint $table) {
            $table->dropIndex(['phone_number']);
        });
    }
};
