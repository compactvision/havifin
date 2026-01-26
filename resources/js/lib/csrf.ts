import axios from './axios';

let csrfInitialized = false;

/**
 * Initialize CSRF protection by fetching the CSRF cookie from Laravel Sanctum.
 * This must be called before making any authenticated requests.
 */
export async function initializeCsrf(): Promise<void> {
    if (csrfInitialized) {
        return;
    }

    try {
        await axios.get('/sanctum/csrf-cookie');
        csrfInitialized = true;
    } catch (error) {
        console.error('Failed to initialize CSRF protection:', error);
        throw error;
    }
}

/**
 * Reset CSRF initialization state (useful for testing or after logout)
 */
export function resetCsrf(): void {
    csrfInitialized = false;
}
