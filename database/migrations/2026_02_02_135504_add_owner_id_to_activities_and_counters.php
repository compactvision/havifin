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
        Schema::table('cashier_activities', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
        });

        Schema::table('counters', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
        });

        // Use Eloquent for backfill to avoid driver-specific SQL issues
        if (class_exists(\App\Models\Counter::class)) {
            \App\Models\Counter::all()->each(function ($counter) {
                if ($counter->shop) {
                    $counter->update(['owner_id' => $counter->shop->owner_id]);
                }
            });
        }

        if (class_exists(\App\Models\CashierActivity::class)) {
             // Disable Global Scope for HasOwner to see all activities during migration
             // Actually, since we are in terminal and owner_id is null for many, we should be fine if we use withoutGlobalScopes
            \App\Models\CashierActivity::withoutGlobalScopes()->get()->each(function ($activity) {
                if ($activity->session_id) {
                    $session = \App\Models\Session::withoutGlobalScopes()->find($activity->session_id);
                    if ($session) {
                        $activity->update(['owner_id' => $session->owner_id]);
                    }
                } else if ($activity->user_id) {
                    $user = \App\Models\User::withoutGlobalScopes()->find($activity->user_id);
                    if ($user) {
                        $activity->update(['owner_id' => $user->owner_id ?: $user->id]);
                    }
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn('owner_id');
        });

        Schema::table('cashier_activities', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn('owner_id');
        });
    }
};
