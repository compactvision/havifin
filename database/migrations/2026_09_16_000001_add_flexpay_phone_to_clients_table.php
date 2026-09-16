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
        Schema::table('clients', function (Blueprint $table) {
            // The mobile money number a FlexPay auto-debit should target,
            // collected at kiosk time for withdrawals - distinct from the
            // client's own `phone` used to identify/track the ticket.
            $table->string('flexpay_phone')->nullable()->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('flexpay_phone');
        });
    }
};
