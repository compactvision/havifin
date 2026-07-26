<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super-admin';
    case Manager = 'manager';
    case Cashier = 'cashier';
    case Client = 'client';

    public function homePath(): string
    {
        return match ($this) {
            self::SuperAdmin => '/admin/shops',
            self::Manager => '/manager',
            self::Cashier => '/cashier/today',
            self::Client => '/clientform',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
