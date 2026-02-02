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
        Schema::table('work_sessions', function (Blueprint $table) {
            try {
                // Ensure a non-unique index exists for shop_id before dropping the unique constraint 
                // that MySQL might be using for the foreign key.
                if (!collect(DB::select("SHOW INDEXES FROM work_sessions"))->contains('Key_name', 'work_sessions_shop_id_index')) {
                    $table->index('shop_id', 'work_sessions_shop_id_index');
                }
            } catch (\Exception $e) {}

            try {
                // Remove the unique constraint on (shop_id, session_date)
                $table->dropUnique(['shop_id', 'session_date']);
            } catch (\Exception $e) {
                // Ignore if it doesn't exist or already dropped
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_sessions', function (Blueprint $table) {
            try {
                $table->unique(['shop_id', 'session_date']);
            } catch (\Exception $e) {
                // Ignore if it fails due to existing duplicates
            }
        });
    }
};
