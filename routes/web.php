<?php

use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\Shop;
use App\Support\TenantAccess;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Default route - redirect to login
Route::get('/', function () {
    return redirect('/login');
})->name('home');

// Public routes
Route::get('/login', function () {
    if (auth()->check()) {
        return redirect(auth()->user()->homePath());
    }

    return Inertia::render('Auth/Login');
})->name('login');

// Protected routes - require authentication
Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', function () {
        $user = auth()->user();

        return match ($user->role) {
            'super-admin' => Inertia::render('SuperAdmin/Shops'),
            'manager' => Inertia::render('Manager'),
            'cashier' => Inertia::render('Cashier'),
            'client' => Inertia::render('ClientForm'),
            default => abort(403),
        };
    })->name('dashboard');

    Route::get('/display', function () {
        return Inertia::render('Display');
    })->middleware('role:cashier,manager')->name('display');

    // Client can access ClientForm
    Route::get('/clientform', function () {
        return Inertia::render('ClientForm');
    })->middleware(['role:client,cashier,manager'])->name('clientform');

    // Cashier can access Cashier and ClientForm
    Route::get('/cashier', function () {
        return Inertia::render('Cashier');
    })->middleware(['role:cashier'])->name('cashier.index');
    Route::get('/cashier/today', function () {
        return Inertia::render('Cashier/TodaySession');
    })->middleware(['role:cashier'])->name('cashier.today');

    // Manager can access everything
    Route::get('/manager', function () {
        return Inertia::render('Manager');
    })->middleware(['role:manager'])->name('manager');

    Route::get('/manager/guide', function () {
        return Inertia::render('Manager/Guide');
    })->middleware(['role:manager'])->name('manager.guide');

    // Manager Shop Selection & Management
    Route::get('/manager/shops', function () {
        return Inertia::render('Manager/ManagerShops');
    })->middleware(['role:manager'])->name('manager.shops');

    Route::get('/manager/shops/{shop}', function (Shop $shop) {
        TenantAccess::authorizeShop(auth()->user(), $shop);

        return Inertia::render('Manager/ManagerShopDetail', [
            'id' => $shop->id,
        ]);
    })->middleware(['role:manager'])->name('manager.shops.show');

    Route::get('/manager/clients/{client}', function (Client $client) {
        TenantAccess::authorizeShop(auth()->user(), $client->shop_id);

        return Inertia::render('Manager/ClientDetail', [
            'id' => $client->id,
        ]);
    })->middleware(['role:manager'])->name('manager.clients.show');

    // Super Admin dedicated shop management
    Route::get('/admin/shops', function () {
        return Inertia::render('SuperAdmin/Shops');
    })->middleware(['role:super-admin'])->name('admin.shops');

    Route::get('/admin/shops/{shop}', function (Shop $shop) {
        TenantAccess::authorizeShop(auth()->user(), $shop);

        return Inertia::render('SuperAdmin/ShopDetail', [
            'id' => $shop->id,
        ]);
    })->middleware(['role:super-admin'])->name('admin.shops.show');

    // Cash Management
    Route::get('/cash/dashboard', function () {
        return Inertia::render('Cash/Dashboard');
    })->middleware(['role:manager,cashier'])->name('cash.dashboard');

    Route::get('/cash/sessions/{session}', function (CashSession $session) {
        TenantAccess::authorizeCashSession(auth()->user(), $session);

        return Inertia::render('Cash/Session', ['id' => $session->id]);
    })->middleware(['role:manager,cashier'])->name('cash.sessions.show');

    Route::get('/cash/registers/{cashRegister}/history', function (CashRegister $cashRegister) {
        TenantAccess::authorizeShop(auth()->user(), $cashRegister->shop_id);

        return Inertia::render('Cash/RegisterHistory', ['id' => $cashRegister->id]);
    })->middleware(['role:manager'])->name('cash.registers.history');
});

require __DIR__.'/settings.php';
