<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Notifications
    |--------------------------------------------------------------------------
    |
    | Driver-based so the provider can be swapped from .env without code
    | changes. Set WHATSAPP_DRIVER=none to disable sending entirely (default,
    | safe with no credentials configured), "ultramsg" once an UltraMsg
    | instance is provisioned, or "makira" for the Makira/Whasend gateway.
    |
    */

    'whatsapp' => [
        'driver' => env('WHATSAPP_DRIVER', 'none'),

        'ultramsg' => [
            'instance_id' => env('WHATSAPP_ULTRAMSG_INSTANCE_ID'),
            'token' => env('WHATSAPP_ULTRAMSG_TOKEN'),
        ],

        'makira' => [
            'endpoint' => env('WHATSAPP_MAKIRA_ENDPOINT', 'https://sender.makiradrc.com/api/v1/messages'),
            'instance_id' => env('WHATSAPP_MAKIRA_INSTANCE_ID'),
            'api_key' => env('WHATSAPP_MAKIRA_API_KEY'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | FlexPay Mobile Money Collections
    |--------------------------------------------------------------------------
    |
    | Credentials for FlexPay's payment API, used to push an automatic mobile
    | money debit ("prélèvement automatique") on deposit tickets. Left blank
    | by default (safe: FlexPayService::isConfigured() gates the feature).
    |
    */

    'flexpay' => [
        'base_url' => env('FLEXPAY_BASE_URL'),
        'merchant' => env('FLEXPAY_MERCHANT'),
        'token' => env('FLEXPAY_TOKEN'),
        'webhook_token' => env('FLEXPAY_WEBHOOK_TOKEN'),
        'poll_interval_seconds' => (int) env('FLEXPAY_POLL_INTERVAL_SECONDS', 5),
        'poll_max_attempts' => (int) env('FLEXPAY_POLL_MAX_ATTEMPTS', 36),
    ],

];
