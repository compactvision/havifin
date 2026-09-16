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
        Schema::create('flexpay_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('institution_id')->nullable()->constrained('institutions')->nullOnDelete();
            $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cash_session_id')->nullable()->constrained('cash_sessions')->nullOnDelete();
            $table->foreignId('session_id')->nullable()->constrained('work_sessions')->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();

            $table->string('reference')->unique();
            $table->string('order_number')->nullable()->unique();
            $table->string('phone');
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3);

            $table->string('status')->default('pending'); // pending, success, failed, refund_pending, refunded, cancelled, timeout
            $table->string('provider_status_code')->nullable();
            $table->string('provider_reference')->nullable();
            $table->string('channel')->nullable();
            $table->decimal('amount_customer', 15, 2)->nullable();
            $table->string('message')->nullable();
            $table->json('raw_response')->nullable();

            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('finalized_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flexpay_transactions');
    }
};
