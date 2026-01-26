import axios from 'axios';
import { initializeCsrf, resetCsrf } from './csrf';

const client = axios.create({
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
    withCredentials: true, // Ensure cookies are sent (important for Sanctum/Session)
    withXSRFToken: true,
});

// Interceptor to ensure CSRF cookie is initialized before authenticated requests
let csrfInitPromise: Promise<void> | null = null;

client.interceptors.request.use(
    async (config) => {
        // Skip CSRF initialization for:
        // 1. GET requests (safe methods)
        // 2. The CSRF cookie endpoint itself
        // 3. Public endpoints that don't require auth
        const isGetRequest = config.method?.toLowerCase() === 'get';
        const isCsrfEndpoint = config.url?.includes('/sanctum/csrf-cookie');
        const isPublicEndpoint =
            config.url?.includes('/advertisements/active') ||
            config.url?.includes('/news/active') ||
            config.url?.includes('/institutions/active') ||
            config.url?.includes('/exchange-rates') ||
            config.url?.includes('/clients/verify-phone') ||
            config.url?.includes('/clients/register');

        if (!isGetRequest && !isCsrfEndpoint && !isPublicEndpoint) {
            // Initialize CSRF only once, reuse the same promise for concurrent requests
            if (!csrfInitPromise) {
                csrfInitPromise = initializeCsrf().catch((error) => {
                    csrfInitPromise = null; // Reset on error to allow retry
                    throw error;
                });
            }
            await csrfInitPromise;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response interceptor to handle authentication errors
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Reset CSRF state on 401 to force re-initialization
            resetCsrf();
            csrfInitPromise = null;

            // Log helpful debugging information
            console.error('Authentication error (401):', {
                url: error.config?.url,
                method: error.config?.method,
                message: 'Session expired or invalid. Please login again.',
            });

            // You can add custom logic here, such as:
            // - Redirecting to login page
            // - Showing a notification
            // - Dispatching a logout action
        }

        return Promise.reject(error);
    },
);

export default client;
