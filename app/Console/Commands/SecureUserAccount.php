<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class SecureUserAccount extends Command
{
    protected $signature = 'user:secure-account {email?}';

    protected $description = 'Assign a strong password, reactivate an account, and revoke its sessions';

    public function handle(): int
    {
        $email = $this->argument('email') ?: $this->ask('Account email');
        $user = User::withoutGlobalScopes()->where('email', $email)->first();

        if (! $user) {
            $this->error('No account matches this email.');

            return self::FAILURE;
        }

        $password = $this->secret('New password');
        $confirmation = $this->secret('Confirm the new password');
        $validator = Validator::make(
            ['password' => $password, 'password_confirmation' => $confirmation],
            ['password' => ['required', 'confirmed', Password::defaults()]],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user->update([
            'password' => $password,
            'is_active' => true,
            'remember_token' => null,
        ]);
        $user->tokens()->delete();
        DB::table('sessions')->where('user_id', $user->id)->delete();

        $this->info('Account secured and reactivated. Existing sessions were revoked.');

        return self::SUCCESS;
    }
}
