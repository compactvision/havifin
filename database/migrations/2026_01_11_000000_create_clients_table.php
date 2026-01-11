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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('phone');
            $table->string('operation_type'); // change, depot, retrait
            $table->string('service'); // mpesa, orange_money, etc.
            $table->string('currency_from')->nullable();
            $table->string('currency_to')->nullable();
            $table->decimal('amount', 15, 2)->nullable();
            $table->string('status')->default('waiting'); // waiting, called, processing, completed, cancelled
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('cashier_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
