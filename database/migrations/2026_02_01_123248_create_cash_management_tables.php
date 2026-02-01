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
        // 1. Cash Registers (Physical/Logical drawer)
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('counter_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Cash Balances (Real-time balance per currency for a register)
        Schema::create('cash_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained()->cascadeOnDelete();
            $table->string('currency', 3); // USD, EUR, etc.
            $table->decimal('amount', 20, 4)->default(0);
            $table->timestamps();
            
            $table->unique(['cash_register_id', 'currency']);
        });

        // 3. Cash Sessions (Cashier assignment)
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained(); // Cashier
            $table->foreignId('work_session_id')->nullable()->constrained('work_sessions')->nullOnDelete();
            $table->string('status')->default('open'); // open, closed
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->text('opening_notes')->nullable();
            $table->text('closing_notes')->nullable();
            $table->timestamps();
        });

        // 4. Cash Session Amounts (Snapshots of balances for a session)
        Schema::create('cash_session_amounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained()->cascadeOnDelete();
            $table->string('currency', 3);
            $table->decimal('opening_amount', 20, 4)->default(0);
            $table->decimal('closing_amount_theoretical', 20, 4)->nullable();
            $table->decimal('closing_amount_real', 20, 4)->nullable();
            $table->decimal('difference', 20, 4)->nullable();
            $table->timestamps();

            $table->unique(['cash_session_id', 'currency']);
        });

        // 5. Cash Movements (Audit trail of money flow)
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_session_id')->constrained(); // No cascade delete for audit
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained(); // Performer
            $table->string('type'); // deposit, withdrawal, exchange_in, exchange_out, adjustment_in, adjustment_out
            $table->string('currency', 3);
            $table->decimal('amount', 20, 4); // Logic: In is + (deposit), Out is - (withdrawal)
            $table->string('description')->nullable();
            $table->json('metadata')->nullable(); // For extra details
            $table->timestamps();
            
            // Allow indexing for quick searches
            $table->index(['cash_session_id', 'created_at']);
        });

        // 6. Cash Audit Logs (Immutable security logs)
        Schema::create('cash_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event'); // opened_session, closed_session, specialized_event
            $table->foreignId('user_id')->constrained();
            $table->nullableMorphs('auditable'); // Polymorphic relation to what was changed
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_audit_logs');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('cash_session_amounts');
        Schema::dropIfExists('cash_sessions');
        Schema::dropIfExists('cash_balances');
        Schema::dropIfExists('cash_registers');
    }
};
