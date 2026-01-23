<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ExchangeRateController;
use App\Http\Controllers\Api\ClientVerificationController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\ExchangeRateHistoryController;
use App\Http\Controllers\Api\CashierActivityController;
use App\Http\Controllers\Api\HelpRequestController;
use App\Http\Controllers\Api\AdvertisementController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\CounterController;

// Authentication & Session-Based API Routes
Route::middleware('web')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth');
    Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth');

    Route::middleware(['auth'])->group(function () {
        // User Management Routes (Manager only)
        Route::middleware(['manager'])->group(function () {
            Route::apiResource('users', UserController::class);
        });

        // Shop Management Routes
        Route::apiResource('shops', ShopController::class);
        Route::post('/shops/{shop}/assign-users', [ShopController::class, 'assignUsers']);
        
        // Counter Management Routes
        Route::get('/shops/{shop}/counters', [CounterController::class, 'index']);
        Route::post('/shops/{shop}/counters', [CounterController::class, 'store']);
        Route::put('/counters/{counter}', [CounterController::class, 'update']);
        Route::delete('/counters/{counter}', [CounterController::class, 'destroy']);

        Route::get('/user', function (Request $request) {
            return $request->user();
        });

        // Institutions
        Route::get('/institutions/active', [InstitutionController::class, 'active']);
        Route::apiResource('institutions', InstitutionController::class);

        // Client Verification & Registration
        Route::post('/clients/verify-phone', [ClientVerificationController::class, 'verifyPhone']);
        Route::post('/clients/register', [ClientVerificationController::class, 'register']);
        Route::post('/clients/add-phone', [ClientVerificationController::class, 'addPhone']);

        // Clients
        Route::apiResource('clients', ClientController::class);
        
        // Existing routes (moved inside auth to ensure session/identity)
        Route::apiResource('transactions', TransactionController::class);
        Route::apiResource('exchange-rates', ExchangeRateController::class);
    });
});

// Sessions
Route::get('/sessions/current', [SessionController::class, 'current']);
Route::post('/sessions/{id}/close', [SessionController::class, 'close']);
Route::get('/sessions/{id}/report', [SessionController::class, 'report']);
Route::get('/sessions', [SessionController::class, 'index']);
Route::post('/sessions', [SessionController::class, 'store']);

// Exchange Rate History
Route::get('/exchange-rate-history/active', [ExchangeRateHistoryController::class, 'active']);
Route::post('/exchange-rate-history/current-rate', [ExchangeRateHistoryController::class, 'currentRate']);
Route::get('/exchange-rate-history', [ExchangeRateHistoryController::class, 'index']);
Route::post('/exchange-rate-history', [ExchangeRateHistoryController::class, 'store']);

// Cashier Activities
Route::get('/cashier-activities/stats', [CashierActivityController::class, 'stats']);
Route::get('/cashier-activities', [CashierActivityController::class, 'index']);
Route::post('/cashier-activities', [CashierActivityController::class, 'store']);

// Help Requests
Route::post('/help-requests/{id}/resolve', [HelpRequestController::class, 'resolve']);
Route::get('/help-requests', [HelpRequestController::class, 'index']);
Route::post('/help-requests', [HelpRequestController::class, 'store']);

// Advertisements
Route::get('/advertisements/active', [AdvertisementController::class, 'active']);
Route::apiResource('advertisements', AdvertisementController::class);

