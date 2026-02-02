<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            // Using raw SQL to modify the enum since standard enum() column update doesn't work well in all cases
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('cashier', 'manager', 'super-admin', 'client') DEFAULT 'cashier'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('cashier', 'manager', 'super-admin') DEFAULT 'cashier'");
    }
};
