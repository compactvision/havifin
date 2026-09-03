/**
 * ISO 3166-1 alpha-2 country code -> flag emoji, via Unicode regional
 * indicator symbols. No image assets, no external requests - works wherever
 * the OS ships colour emoji fonts (every platform this app targets does).
 */
export function flagEmoji(countryCode?: string | null): string {
    if (!countryCode || countryCode.length !== 2) return '';

    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0));

    return String.fromCodePoint(...codePoints);
}

// The BCC feed gives a country per currency, but our own locally-configured
// rates (ExchangeRate/RatesManager) only carry a currency code - map the
// common ones so those screens can show a flag too.
const CURRENCY_TO_COUNTRY: Record<string, string> = {
    USD: 'us',
    EUR: 'eu',
    CDF: 'cd',
    GBP: 'gb',
    CNY: 'cn',
    ZAR: 'za',
    AED: 'ae',
    CHF: 'ch',
    CAD: 'ca',
    AUD: 'au',
    RWF: 'rw',
    UGX: 'ug',
    TZS: 'tz',
    BIF: 'bi',
    KWD: 'kw',
    SAR: 'sa',
    INR: 'in',
    JPY: 'jp',
    AOA: 'ao',
    XAF: 'cf',
    ZMW: 'zm',
};

export function flagForCurrency(currencyCode?: string | null): string {
    if (!currencyCode) return '';
    return flagEmoji(CURRENCY_TO_COUNTRY[currencyCode.toUpperCase()]);
}
