<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A previous migration tried to drop this index with SQLite's
     * `DROP INDEX IF EXISTS <name>` syntax, which is invalid on MySQL and
     * was silently swallowed by a try/catch — so the stale (session_date,
     * owner_id) unique constraint stayed in place on MySQL, incorrectly
     * limiting a tenant to a single open session per day across ALL of
     * their shops instead of one per shop.
     */
    public function up(): void
    {
        if (! Schema::hasTable('work_sessions')) {
            return;
        }

        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS work_sessions_session_date_owner_id_unique');

            return;
        }

        $indexExists = collect($connection->select(
            'SHOW INDEX FROM work_sessions WHERE Key_name = ?',
            ['work_sessions_session_date_owner_id_unique']
        ))->isNotEmpty();

        if ($indexExists) {
            DB::statement('ALTER TABLE work_sessions DROP INDEX work_sessions_session_date_owner_id_unique');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally not restoring the faulty constraint.
    }
};
