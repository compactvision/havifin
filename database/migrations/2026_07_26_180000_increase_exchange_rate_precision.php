<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->decimal('buy_rate', 18, 8)->change();
            $table->decimal('sell_rate', 18, 8)->change();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->decimal('exchange_rate', 18, 8)->change();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->decimal('exchange_rate', 18, 8)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('exchange_rates', function (Blueprint $table) {
            $table->decimal('buy_rate', 10, 4)->change();
            $table->decimal('sell_rate', 10, 4)->change();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->decimal('exchange_rate', 10, 4)->change();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->decimal('exchange_rate', 15, 4)->nullable()->change();
        });
    }
};
