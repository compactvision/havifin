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
        Schema::table('advertisements', function (Blueprint $table) {
            $table->longText('image_url')->change();
        });

        Schema::table('institutions', function (Blueprint $table) {
            $table->text('logo_url')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->text('image_url')->change();
        });

        Schema::table('institutions', function (Blueprint $table) {
            $table->string('logo_url', 255)->change();
        });
    }
};
