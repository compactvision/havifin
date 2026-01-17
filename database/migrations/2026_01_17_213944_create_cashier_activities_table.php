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
        Schema::create('cashier_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cashier_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('session_id')->nullable()->constrained('work_sessions')->onDelete('set null');
            $table->enum('activity_type', [
                'login',
                'logout',
                'call_client',
                'complete_transaction',
                'help_request',
                'recall_client'
            ]);
            $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('set null');
            $table->text('description')->nullable();
            $table->timestamp('created_at');

            $table->index('cashier_id');
            $table->index('session_id');
            $table->index(['cashier_id', 'session_id']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_activities');
    }
};
