<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The title is required so a manager can identify an ad in the list, but
     * that doesn't mean it belongs on the public screen too - some visuals
     * (a full-bleed poster, a video with its own caption) don't need the
     * overlay. Default true so every existing ad keeps showing its title.
     */
    public function up(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->boolean('show_title')->default(true)->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->dropColumn('show_title');
        });
    }
};
