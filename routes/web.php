<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Default route - redirect to login
Route::get('/', function () {
    return redirect('/login');
});

// Public routes
Route::get('/login', function () {
    // If already authenticated, redirect to appropriate page
    if (auth()->check()) {
        $user = auth()->user();
        if ($user->hasRole('super-admin')) {
            return redirect('/admin/shops');
        } elseif ($user->hasRole('manager')) {
            return redirect('/manager/shops');
        } elseif ($user->hasRole('cashier')) {
            return redirect('/cashier');
        } elseif ($user->hasRole('client')) {
            return redirect('/clientform');
        }
    }
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/display', function () {
    return Inertia::render('Display');
})->name('display');

// Protected routes - require authentication
Route::middleware(['auth'])->group(function () {
    // Client can access ClientForm
    Route::get('/clientform', function () {
        return Inertia::render('ClientForm');
    })->middleware(['role:client,cashier,manager,super-admin'])->name('clientform');

    // Cashier can access Cashier and ClientForm
    Route::get('/cashier', function () {
        return Inertia::render('Cashier');
    })->middleware(['role:cashier,manager,super-admin'])->name('cashier');

    // Manager can access everything
    Route::get('/manager', function () {
        return Inertia::render('Manager');
    })->middleware(['role:manager,super-admin'])->name('manager');
    
    // Manager Shop Selection & Management
    Route::get('/manager/shops', function () {
        return Inertia::render('Manager/ManagerShops');
    })->middleware(['role:manager,super-admin'])->name('manager.shops');
    
    Route::get('/manager/shops/{id}', function ($id) {
        return Inertia::render('Manager/ManagerShopDetail', [
            'id' => $id
        ]);
    })->middleware(['role:manager,super-admin'])->name('manager.shops.show');

    // Super Admin dedicated shop management
    Route::get('/admin/shops', function () {
        return Inertia::render('SuperAdmin/Shops');
    })->middleware(['role:super-admin'])->name('admin.shops');

    Route::get('/admin/shops/{id}', function ($id) {
        return Inertia::render('SuperAdmin/ShopDetail', [
            'id' => $id
        ]);
    })->middleware(['role:super-admin'])->name('admin.shops.show');
});
