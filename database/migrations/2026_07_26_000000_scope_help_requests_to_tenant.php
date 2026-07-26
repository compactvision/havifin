<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('help_requests', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->foreignId('shop_id')->nullable()->after('owner_id')->constrained('shops')->nullOnDelete();
            $table->foreignId('session_id')->nullable()->after('shop_id')->constrained('work_sessions')->nullOnDelete();
            $table->index(['owner_id', 'shop_id', 'status']);
        });

        DB::table('help_requests')->orderBy('id')->each(function ($helpRequest) {
            $user = DB::table('users')->where('id', $helpRequest->cashier_id)->first();
            if (! $user) {
                return;
            }

            $shopId = DB::table('shop_user')
                ->where('user_id', $user->id)
                ->orderBy('shop_id')
                ->value('shop_id');

            DB::table('help_requests')->where('id', $helpRequest->id)->update([
                'owner_id' => $user->role === 'super-admin' ? $user->id : $user->owner_id,
                'shop_id' => $shopId,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('help_requests', function (Blueprint $table) {
            $table->dropIndex(['owner_id', 'shop_id', 'status']);
            $table->dropConstrainedForeignId('session_id');
            $table->dropConstrainedForeignId('shop_id');
            $table->dropConstrainedForeignId('owner_id');
        });
    }
};
