<?php

namespace App\Providers;

use App\Models\CashierActivity;
use App\Models\Transaction;
use App\Observers\TransactionObserver;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(fn () => Password::min(12)
            ->mixedCase()
            ->numbers()
            ->symbols());

        Transaction::observe(TransactionObserver::class);

        // Fortify fires this on every successful login (SPA session or 2FA
        // challenge) - logging it here is the only place that covers both,
        // and gives managers/admins the real connection time they lacked.
        Event::listen(function (Login $event) {
            CashierActivity::create([
                'cashier_id' => $event->user->id,
                'activity_type' => 'login',
                'description' => "Connexion utilisateur: {$event->user->name}",
                'created_at' => now(),
            ]);
        });
    }
}
