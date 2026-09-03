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
 *
 * Rendered as a circle: the outer span sizes and clips, the inner one
 * carries the flag-icons background scaled to cover it. flag-icons'
 * own ".fi" rule has no display/size of its own, so a plain span with
 * only width/height classes stays invisible (inline elements ignore
 * width/height) - the outer span must be block-level.
 */
export function FlagIcon({ currency, className }: FlagIconProps) {
    const countryCode = countryCodeForCurrency(currency);
    if (!countryCode) return null;

    return (
        <span
            className={cn(
                'inline-block aspect-square shrink-0 overflow-hidden rounded-full ring-1 ring-black/10',
                className,
            )}
        >
            <span
                className={`fi fi-${countryCode}`}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    backgroundSize: 'cover',
                }}
                aria-hidden="true"
            />
        </span>
    );
}
