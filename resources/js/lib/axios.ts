import axios from 'axios';

const client = axios.create({
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
    withCredentials: true, // Ensure cookies are sent (important for Sanctum/Session)
    withXSRFToken: true,
});

export default client;
