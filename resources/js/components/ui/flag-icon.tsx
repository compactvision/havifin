import { countryCodeForCurrency } from '@/lib/flags';
import { cn } from '@/lib/utils';

interface FlagIconProps {
    currency?: string | null;
    className?: string;
}

/**
 * Renders a real country flag (flag-icons sprite) for a currency code,
 * instead of an emoji - emoji glyphs render inconsistently (and as bare
 * text on some platforms), a proper icon looks the same everywhere.
 */
export function FlagIcon({ currency, className }: FlagIconProps) {
    const countryCode = countryCodeForCurrency(currency);
    if (!countryCode) return null;

    return (
        <span
            className={cn(`fi fi-${countryCode} rounded-[3px]`, className)}
            aria-hidden="true"
        />
    );
}
