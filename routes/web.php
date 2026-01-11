<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('ClientForm');
})->name('home');

Route::get('/cashier', function () {
    return Inertia::render('Cashier');
})->name('cashier');

Route::get('/manager', function () {
    return Inertia::render('Manager');
})->name('manager');

Route::get('/display', function () {
    return Inertia::render('Display');
})->name('display');
