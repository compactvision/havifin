<?php

use App\Http\Controllers\Api\AdvertisementController;
use App\Http\Controllers\Api\CashierActivityController;
use App\Http\Controllers\Api\CashMovementController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\CashSessionController;
use App\Http\Controllers\Api\ClientVerificationController;
use App\Http\Controllers\Api\CounterController;
use App\Http\Controllers\Api\ExchangeRateHistoryController;
use App\Http\Controllers\Api\HelpRequestController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\BccRateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ExchangeRateController;
use App\Http\Controllers\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Authentication & Session-Based API Routes
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware(['auth:sanctum', 'active']);
Route::get('/auth/me', [AuthController::class, 'me'])->middleware(['auth:sanctum', 'active']);

// User administration is role-aware inside the controller:
// Super Admins manage managers, Managers manage operational users.
Route::middleware(['auth:sanctum', 'active', 'role:manager,super-admin'])->group(function () {
    Route::apiResource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
});

// General Auth routes
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::middleware('role:cashier,manager,super-admin')->group(function () {
        Route::get('/shops', [ShopController::class, 'index']);
        Route::get('/shops/{shop}', [ShopController::class, 'show']);
    });
    Route::get('/shops/{shop}/counters', [CounterController::class, 'index'])
        ->middleware('role:cashier,manager');
    Route::put('/shops/{shop}', [ShopController::class, 'update'])
        ->middleware('role:manager,super-admin');
    Route::middleware('role:manager')->group(function () {
        Route::post('/shops/{shop}/assign-users', [ShopController::class, 'assignUsers']);
        Route::post('/shops/{shop}/counters', [CounterController::class, 'store']);
        Route::put('/counters/{counter}', [CounterController::class, 'update']);
        Route::delete('/counters/{counter}', [CounterController::class, 'destroy']);
    });

    Route::middleware('role:super-admin')->group(function () {
        Route::post('/shops', [ShopController::class, 'store']);
        Route::delete('/shops/{shop}', [ShopController::class, 'destroy']);
        Route::get('/shops/{shop}/statistics', [ShopController::class, 'statistics']);
        Route::post('/shops/{shop}/assign-managers', [ShopController::class, 'assignManagers']);
    });

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

    Route::middleware('role:cashier,manager')->group(function () {
        Route::apiResource('clients', ClientController::class)->only(['index', 'show', 'update']);
        Route::apiResource('transactions', TransactionController::class)->only(['index']);
        Route::get('/transactions/{transaction}/receipt', [ReceiptController::class, 'show']);
    });
    Route::post('/transactions', [TransactionController::class, 'store'])
        ->middleware('role:cashier');

    Route::post('/clients', [ClientController::class, 'store'])
        ->middleware('role:client,cashier,manager');
    Route::post('/clients/verify-phone', [ClientVerificationController::class, 'verifyPhone'])
        ->middleware(['role:client,cashier,manager', 'throttle:30,1']);
    Route::post('/clients/register', [ClientVerificationController::class, 'register'])
        ->middleware('role:client,cashier,manager');
    Route::post('/clients/add-phone', [ClientVerificationController::class, 'addPhone'])
        ->middleware('role:client,cashier,manager');

    Route::get('/exchange-rates', [ExchangeRateController::class, 'index'])
        ->middleware('role:client,cashier,manager');
    Route::middleware('role:manager')->group(function () {
        Route::post('/exchange-rates', [ExchangeRateController::class, 'store']);
        Route::match(['put', 'patch'], '/exchange-rates/{exchangeRate}', [ExchangeRateController::class, 'update']);
        Route::delete('/exchange-rates/{exchangeRate}', [ExchangeRateController::class, 'destroy']);
        Route::get('/bcc-rates', [BccRateController::class, 'index']);
        Route::post('/bcc-rates/apply', [BccRateController::class, 'apply']);
    });

    Route::get('/sessions/current', [SessionController::class, 'current'])
        ->middleware('role:client,cashier,manager');
    Route::middleware('role:manager')->group(function () {
        Route::get('/sessions', [SessionController::class, 'index']);
        Route::post('/sessions', [SessionController::class, 'store']);
        Route::post('/sessions/{id}/close', [SessionController::class, 'close']);
        Route::post('/sessions/{id}/reopen', [SessionController::class, 'reopen']);
        Route::get('/sessions/{id}/report', [SessionController::class, 'report']);
        Route::get('/exchange-rate-history', [ExchangeRateHistoryController::class, 'index']);
        Route::post('/exchange-rate-history', [ExchangeRateHistoryController::class, 'store']);
    });

    Route::get('/exchange-rate-history/active', [ExchangeRateHistoryController::class, 'active'])
        ->middleware('role:client,cashier,manager');
    Route::post('/exchange-rate-history/current-rate', [ExchangeRateHistoryController::class, 'currentRate'])
        ->middleware('role:client,cashier,manager');

    Route::middleware('role:manager')->group(function () {
        Route::get('/cashier-activities/stats', [CashierActivityController::class, 'stats']);
        Route::get('/cashier-activities', [CashierActivityController::class, 'index']);
        Route::post('/help-requests/{id}/resolve', [HelpRequestController::class, 'resolve']);
        Route::get('/help-requests', [HelpRequestController::class, 'index']);
    });
    Route::post('/cashier-activities', [CashierActivityController::class, 'store'])
        ->middleware('role:cashier');
    Route::post('/help-requests', [HelpRequestController::class, 'store'])
        ->middleware('role:cashier');

    Route::middleware('role:cashier,manager')->group(function () {
        Route::get('cash/registers', [CashRegisterController::class, 'index']);
        Route::get('cash/registers/{cash_register}', [CashRegisterController::class, 'show']);
        Route::get('/cash/sessions/current', [CashSessionController::class, 'current']);
        Route::post('/cash/sessions/{session}/close', [CashSessionController::class, 'close']);
        Route::get('cash/sessions', [CashSessionController::class, 'index']);
        Route::post('cash/sessions', [CashSessionController::class, 'store']);
        Route::get('cash/sessions/{session}/report', [CashSessionController::class, 'report']);
        Route::get('cash/sessions/{session}', [CashSessionController::class, 'show']);
        Route::get('/cash/movements', [CashMovementController::class, 'index']);
        Route::get('/cash/sessions/{session}/movements', [CashMovementController::class, 'index']);
    });
    Route::middleware('role:manager')->group(function () {
        Route::post('cash/registers', [CashRegisterController::class, 'store']);
        Route::post('/cash/movements', [CashMovementController::class, 'store']);
    });

    Route::middleware('role:client,cashier,manager')->group(function () {
        Route::get('/advertisements/active', [AdvertisementController::class, 'active']);
        Route::get('/advertisements', [AdvertisementController::class, 'index']);
        Route::get('/news/active', [NewsController::class, 'active']);
        Route::get('/news', [NewsController::class, 'index']);
        Route::get('/institutions/active', [InstitutionController::class, 'active']);
        Route::get('/institutions', [InstitutionController::class, 'index']);
    });
});
