<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_sessions', function (Blueprint $table) {
            $table->boolean('force_closed')->default(false)->after('status');
        });

        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->boolean('force_closed')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('work_sessions', function (Blueprint $table) {
            $table->dropColumn('force_closed');
        });

        Schema::table('cash_sessions', function (Blueprint $table) {
            $table->dropColumn('force_closed');
        });
    }
};
