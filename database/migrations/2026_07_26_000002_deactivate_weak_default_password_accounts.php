<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->select(['id', 'password'])
            ->orderBy('id')
            ->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    if (! Hash::check('password', $user->password)) {
                        continue;
                    }

                    DB::table('users')->where('id', $user->id)->update([
                        'is_active' => false,
                        'remember_token' => null,
                        'updated_at' => now(),
                    ]);

                    if (Schema::hasTable('personal_access_tokens')) {
                        DB::table('personal_access_tokens')
                            ->where('tokenable_type', 'App\\Models\\User')
                            ->where('tokenable_id', $user->id)
                            ->delete();
                    }

                    if (Schema::hasColumn('sessions', 'user_id')) {
                        DB::table('sessions')->where('user_id', $user->id)->delete();
                    }
                }
            });
    }

    public function down(): void
    {
        // Deliberately irreversible: accounts with a known password must be
        // reactivated only after an administrator assigns a strong password.
    }
};
