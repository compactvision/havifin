<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Screen content was scoped to the owner only, so every shop of the same
     * owner showed the same ads and news. Scope it per shop instead.
     *
     * The column stays nullable on purpose: null means "all of this owner's
     * shops", which keeps existing rows behaving exactly as before and still
     * allows a company-wide announcement.
     */
    public function up(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->foreignId('shop_id')
                ->nullable()
                ->after('owner_id')
                ->constrained('shops')
                ->cascadeOnDelete();
            $table->index(['shop_id', 'is_active']);
        });

        Schema::table('news', function (Blueprint $table) {
            $table->foreignId('shop_id')
                ->nullable()
                ->after('owner_id')
                ->constrained('shops')
                ->cascadeOnDelete();
            $table->index(['shop_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->dropIndex(['shop_id', 'is_active']);
            $table->dropConstrainedForeignId('shop_id');
        });

        Schema::table('news', function (Blueprint $table) {
            $table->dropIndex(['shop_id', 'is_active']);
            $table->dropConstrainedForeignId('shop_id');
        });
    }
};
