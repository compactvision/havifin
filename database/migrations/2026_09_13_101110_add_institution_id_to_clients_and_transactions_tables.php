<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The client form already lets an operator pick an institution (M-Pesa,
     * Orange Money, ...) for a depot/retrait, but only its name ever reached
     * the backend (as the free-text "service" field) - there was no durable
     * link to the Institution row, so a partner's float could never be
     * reconciled against the transactions actually run through it.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('institution_id')->nullable()->after('service')
                ->constrained()->nullOnDelete();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('institution_id')->nullable()->after('service')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('institution_id');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('institution_id');
        });
    }
};
