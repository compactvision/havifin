<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ExchangeRateController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::apiResource('clients', ClientController::class);
Route::apiResource('transactions', TransactionController::class);
Route::apiResource('exchange-rates', ExchangeRateController::class);
