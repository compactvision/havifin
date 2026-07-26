<?php

namespace App\Support;

use App\Models\CashSession;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

final class TenantAccess
{
    public static function ownerId(User $user): int
    {
        if ($user->isSuperAdmin()) {
            return $user->id;
        }

        abort_unless($user->owner_id, 403, 'Compte sans environnement propriétaire.');

        return (int) $user->owner_id;
    }

    /**
     * @return Collection<int, int>
     */
    public static function shopIds(User $user): Collection
    {
        if ($user->isSuperAdmin()) {
            return Shop::where('owner_id', $user->id)->pluck('id');
        }

        return $user->shops()->pluck('shops.id');
    }

    public static function authorizeOwner(User $user, Model $model): void
    {
        abort_unless(
            (int) $model->getAttribute('owner_id') === self::ownerId($user),
            403,
            'Cette ressource appartient à un autre environnement.',
        );
    }

    public static function authorizeShop(User $user, Shop|int|null $shop): void
    {
        $shopId = $shop instanceof Shop ? $shop->id : $shop;
        abort_if(! $shopId, 403, 'Aucune boutique valide.');

        if ($user->isSuperAdmin()) {
            $ownerId = $shop instanceof Shop
                ? $shop->owner_id
                : Shop::whereKey($shopId)->value('owner_id');

            abort_unless((int) $ownerId === $user->id, 403, 'Boutique non autorisée.');

            return;
        }

        abort_unless(
            $user->shops()->whereKey($shopId)->exists(),
            403,
            'Boutique non autorisée.',
        );
    }

    public static function resolveShopId(User $user, int|string|null $requestedShopId = null): int
    {
        $shopId = $requestedShopId !== null
            ? (int) $requestedShopId
            : (int) $user->shops()->value('shops.id');

        self::authorizeShop($user, $shopId);

        return $shopId;
    }

    /**
     * Managers may inspect every cash session in their assigned shops.
     * Cashiers are restricted to their own till session.
     */
    public static function authorizeCashSession(User $user, CashSession $session): void
    {
        $session->loadMissing('register:id,shop_id');
        self::authorizeShop($user, $session->register?->shop_id);

        if ($user->isCashier()) {
            abort_unless(
                (int) $session->user_id === $user->id,
                403,
                'Cette session de caisse appartient à un autre caissier.',
            );
        }
    }
}
