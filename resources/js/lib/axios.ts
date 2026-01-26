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
        // Initialize CSRF for all non-GET requests (POST, PUT, DELETE, PATCH)
        // Skip only:
        // 1. GET requests (safe methods that don't modify data)
        // 2. The CSRF cookie endpoint itself (to avoid infinite loop)
        const isGetRequest = config.method?.toLowerCase() === 'get';
        const isCsrfEndpoint = config.url?.includes('/sanctum/csrf-cookie');

        if (!isGetRequest && !isCsrfEndpoint) {
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
