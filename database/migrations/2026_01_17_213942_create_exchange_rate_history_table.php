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
        Schema::create('exchange_rate_history', function (Blueprint $table) {
            $table->id();
            $table->string('currency_from', 3); // USD, CDF, EUR, etc.
            $table->string('currency_to', 3);
            $table->decimal('rate', 15, 6);
            $table->timestamp('effective_from');
            $table->timestamp('effective_to')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('session_id')->nullable()->constrained('work_sessions')->onDelete('set null');
            $table->timestamps();

            $table->index(['currency_from', 'currency_to'], 'erh_currencies_idx');
            $table->index('effective_from', 'erh_eff_from_idx');
            $table->index(['currency_from', 'currency_to', 'effective_from'], 'erh_cur_eff_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exchange_rate_history');
    }
};
