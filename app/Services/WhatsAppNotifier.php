<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends WhatsApp messages through a swappable provider driver, selected via
 * the WHATSAPP_DRIVER env var. With no driver configured (the default) sends
 * are safely skipped and logged instead of failing.
 */
class WhatsAppNotifier
{
    public function send(string $phone, string $message): bool
    {
        return match (config('services.whatsapp.driver', 'none')) {
            'ultramsg' => $this->sendViaUltraMsg($phone, $message),
            default => $this->skip($phone),
        };
    }

    private function skip(string $phone): bool
    {
        Log::info('WhatsApp notification skipped: no provider configured (WHATSAPP_DRIVER=none).', [
            'phone' => $phone,
        ]);

        return false;
    }

    private function sendViaUltraMsg(string $phone, string $message): bool
    {
        $instanceId = config('services.whatsapp.ultramsg.instance_id');
        $token = config('services.whatsapp.ultramsg.token');

        if (! $instanceId || ! $token) {
            Log::warning('WhatsApp driver "ultramsg" selected but instance_id/token are missing.');

            return false;
        }

        try {
            $response = Http::asForm()->post("https://api.ultramsg.com/{$instanceId}/messages/chat", [
                'token' => $token,
                'to' => $this->normalizePhone($phone),
                'body' => $message,
            ]);
        } catch (\Throwable $exception) {
            Log::error('WhatsApp UltraMsg request threw an exception.', [
                'phone' => $phone,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }

        if ($response->failed()) {
            Log::error('WhatsApp UltraMsg send failed.', [
                'phone' => $phone,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * UltraMsg (and most WhatsApp APIs) expect an international number with
     * no leading zero or "+". Assume DRC (+243) for local 10-digit numbers.
     */
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
            $digits = '243'.substr($digits, 1);
        }

        return $digits;
    }
}
