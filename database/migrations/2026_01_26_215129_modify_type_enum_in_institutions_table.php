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
        Schema::table('institutions', function (Blueprint $table) {
            // Changing to string removes the enum constraint and allows 'payment'
            $table->string('type')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            // Reverting would require knowing the exact original state, 
            // but effectively we can't easily revert to enum with data validation here 
            // without dataloss if 'payment' exists. 
            // We'll leave it as string or attempt to revert to enum if empty.
            // For safety in this context, we will not strictly revert to enum to avoid errors.
        });
    }
};
