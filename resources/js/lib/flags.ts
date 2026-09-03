// The BCC feed gives a country per currency, but our own locally-configured
// rates (ExchangeRate/RatesManager) only carry a currency code - map the
// common ones so those screens can show a flag too. Values are ISO 3166-1
// alpha-2 codes, matching the flag-icons CSS sprite (fi fi-<code>).
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

export function countryCodeForCurrency(
    currencyCode?: string | null,
): string | null {
    if (!currencyCode) return null;
    return CURRENCY_TO_COUNTRY[currencyCode.toUpperCase()] ?? null;
}
