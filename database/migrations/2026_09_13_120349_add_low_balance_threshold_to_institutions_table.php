<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lets a manager set a per-operator float floor (e.g. "alert me if
     * M-Pesa drops below 20 000 CDF") so a depot/retrait that drains it
     * too far can be caught before the cashier runs out of float mid-day,
     * instead of only being discovered at closing.
     */
    public function up(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->decimal('low_balance_threshold', 20, 4)->nullable()->after('settings');
        });
    }

    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->dropColumn('low_balance_threshold');
        });
    }
};
