<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->json('low_balance_thresholds')->nullable()->after('low_balance_threshold');
        });

        // Existing thresholds were a single unlabeled number - the operators
        // in this app trade mostly in CDF, so that's the safest currency to
        // attach the old value to rather than losing it outright.
        DB::table('institutions')
            ->whereNotNull('low_balance_threshold')
            ->orderBy('id')
            ->each(function ($institution) {
                DB::table('institutions')
                    ->where('id', $institution->id)
                    ->update([
                        'low_balance_thresholds' => json_encode(['CDF' => (float) $institution->low_balance_threshold]),
                    ]);
            });

        Schema::table('institutions', function (Blueprint $table) {
            $table->dropColumn('low_balance_threshold');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->decimal('low_balance_threshold', 20, 4)->nullable()->after('is_active');
        });

        DB::table('institutions')
            ->whereNotNull('low_balance_thresholds')
            ->orderBy('id')
            ->each(function ($institution) {
                $thresholds = json_decode($institution->low_balance_thresholds, true) ?? [];
                $value = $thresholds['CDF'] ?? reset($thresholds) ?: null;

                DB::table('institutions')
                    ->where('id', $institution->id)
                    ->update(['low_balance_threshold' => $value]);
            });

        Schema::table('institutions', function (Blueprint $table) {
            $table->dropColumn('low_balance_thresholds');
        });
    }
};
