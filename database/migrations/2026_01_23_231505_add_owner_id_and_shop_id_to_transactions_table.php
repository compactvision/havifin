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
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            $table->foreignId('shop_id')->nullable()->after('owner_id')->constrained('shops')->onDelete('set null');
            $table->index(['owner_id', 'shop_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropForeign(['shop_id']);
            $table->dropColumn(['owner_id', 'shop_id']);
        });
    }
};
