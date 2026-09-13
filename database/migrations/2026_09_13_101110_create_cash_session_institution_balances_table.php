<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mirrors cash_session_amounts, but for a partner's float (M-Pesa,
     * Orange Money, ...) instead of physical currency - the cashier declares
     * what they start with per active institution, it tracks live as
     * depot/retrait transactions run through that institution, and closing
     * it records what was actually counted vs what was expected.
     */
    public function up(): void
    {
        Schema::create('cash_session_institution_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('currency', 3);
            $table->decimal('opening_amount', 20, 4)->default(0);
            $table->decimal('current_theoretical', 20, 4)->default(0);
            $table->decimal('closing_amount_real', 20, 4)->nullable();
            $table->decimal('difference', 20, 4)->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['cash_session_id', 'institution_id', 'currency'], 'cash_session_institution_currency_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_session_institution_balances');
    }
};
