import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

// Attach correct token: profileToken first, fall back to accountToken
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const profileToken = localStorage.getItem('profileToken');
        const accountToken = localStorage.getItem('accessToken');
        
        let token = profileToken || accountToken;

        // Force accountToken for endpoints that explicitly require it, skipping profileToken priority
        if (config.url?.includes('/select-account') || config.url?.includes('/verify-pin-account') || config.url?.includes('/profiles')) {
            // Only if it's specifically a GET /profiles or POST /profiles route that needs account auth.
            // But select-account & verify-pin-account definitely need it.
            if (!config.url.match(/\/profiles\/[\w-]+\/(?!select-account|verify-pin-account)/)) {
                 token = accountToken;
            }
        }

        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;

        if (err.response?.status === 404 && original.url?.includes('/profiles/')) {
             if (typeof window !== 'undefined') {
                 localStorage.removeItem('profileToken');
                 localStorage.removeItem('accessToken');
                 localStorage.removeItem('activeProfile');
                 window.location.href = '/profiles';
             }
             return Promise.reject(err);
        }

        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            // If we were using a profileToken, just clear it and redirect to profiles
            // IMPORTANT: Bypass this purge if we are actively onboarding (hitting generate endpoints),
            // because long-polling these endpoints with fresh tokens occasionally triggers false 401 pingbacks on async race conditions
            const isOnboardingEndpoint = original.url?.includes('/generate') || original.url?.includes('/calculate');
            
            if (typeof window !== 'undefined' && localStorage.getItem('profileToken') && !isOnboardingEndpoint) {
                localStorage.removeItem('profileToken');
                localStorage.removeItem('activeProfile');
                window.location.href = '/profiles';
                return Promise.reject(err);
            }
            try {
                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                const newToken = res.data.accessToken;
                localStorage.setItem('accessToken', newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch {
                localStorage.removeItem('accessToken');
                window.location.href = '/profiles';
            }
        }
        return Promise.reject(err);
    }
);

export default api;
