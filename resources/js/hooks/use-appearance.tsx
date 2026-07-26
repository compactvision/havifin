export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = 'light' | 'dark' | 'system';

const setLightPreference = (): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'only light';
    document.cookie = 'appearance=light;path=/;max-age=31536000;SameSite=Lax';

    if (typeof window !== 'undefined') {
        localStorage.setItem('appearance', 'light');
        localStorage.removeItem('havifin_display_theme');
    }
};

export function initializeTheme(): void {
    setLightPreference();
}

export function useAppearance() {
    const updateAppearance = (): void => setLightPreference();

    return {
        appearance: 'light' as Appearance,
        resolvedAppearance: 'light' as ResolvedAppearance,
        updateAppearance,
    };
}
