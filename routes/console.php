<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// A daily work session must not span more than its own day: force-close any
// session (and the cash sessions inside it) still open once its date has
// passed, since nothing else guarantees it gets closed on time.
Schedule::command('sessions:close-stale')->dailyAt('00:05');
