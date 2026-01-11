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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('client_id')->nullable(); // Can link to clients table ID or ticket-based ID
            $table->string('ticket_number');
            $table->string('operation_type');
            $table->string('service');
            $table->string('currency_from');
            $table->string('currency_to');
            $table->decimal('amount_from', 15, 2);
            $table->decimal('amount_to', 15, 2);
            $table->decimal('exchange_rate', 10, 4);
            $table->decimal('commission', 15, 2)->default(0);
            $table->string('cashier_email')->nullable();
            $table->string('client_phone')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
