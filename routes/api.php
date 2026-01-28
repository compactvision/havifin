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
use App\Http\Controllers\Api\NewsController;

// Authentication & Session-Based API Routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth');
Route::get('/auth/me', [AuthController::class, 'me'])->middleware('auth');

// Manager only routes
Route::middleware(['auth', 'manager'])->group(function () {
    Route::apiResource('users', UserController::class);
});

// General Auth routes
Route::middleware(['auth'])->group(function () {
    Route::apiResource('shops', ShopController::class);
    Route::post('/shops/{shop}/assign-users', [ShopController::class, 'assignUsers']);
    Route::get('/shops/{shop}/counters', [CounterController::class, 'index']);
    Route::post('/shops/{shop}/counters', [CounterController::class, 'store']);
    Route::put('/counters/{counter}', [CounterController::class, 'update']);
    Route::delete('/counters/{counter}', [CounterController::class, 'destroy']);
    
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Protected CRUD for institutions/advertisements/news (Managers)
    Route::middleware(['manager'])->group(function () {
        Route::post('/institutions', [InstitutionController::class, 'store']);
        Route::put('/institutions/{institution}', [InstitutionController::class, 'update']);
        Route::delete('/institutions/{institution}', [InstitutionController::class, 'destroy']);

        Route::post('/advertisements', [AdvertisementController::class, 'store']);
        Route::put('/advertisements/{advertisement}', [AdvertisementController::class, 'update']);
        Route::delete('/advertisements/{advertisement}', [AdvertisementController::class, 'destroy']);

        Route::post('/news', [NewsController::class, 'store']);
        Route::put('/news/{news}', [NewsController::class, 'update']);
        Route::delete('/news/{news}', [NewsController::class, 'destroy']);
    });

    // Full CRUD for Clients & Transactions
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('transactions', TransactionController::class);
});

// --- Public API Routes (No Auth Required) ---

// TV Display & Public Info
Route::get('/advertisements/active', [AdvertisementController::class, 'active']);
Route::get('/advertisements', [AdvertisementController::class, 'index']);
Route::get('/news/active', [NewsController::class, 'active']);
Route::get('/news', [NewsController::class, 'index']);
Route::get('/institutions/active', [InstitutionController::class, 'active']);
Route::get('/institutions', [InstitutionController::class, 'index']);
Route::get('/exchange-rates', [ExchangeRateController::class, 'index']);

// Client Verification & Registration (Public for ClientForm)
Route::post('/clients/verify-phone', [ClientVerificationController::class, 'verifyPhone']);
Route::post('/clients/register', [ClientVerificationController::class, 'register']);
Route::post('/clients/add-phone', [ClientVerificationController::class, 'addPhone']);

// Sessions (Maybe should be protected, but for now kept as before)
Route::get('/sessions/current', [SessionController::class, 'current']);
Route::post('/sessions/{id}/close', [SessionController::class, 'close']);
Route::post('/sessions/{id}/reopen', [SessionController::class, 'reopen']);
Route::get('/sessions/{id}/report', [SessionController::class, 'report']);
Route::get('/sessions', [SessionController::class, 'index']);
Route::post('/sessions', [SessionController::class, 'store']);

// Exchange Rate History (Public for ticker)
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

