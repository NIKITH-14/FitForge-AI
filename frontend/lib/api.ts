import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

// Attach the correct Authorization token to every request.
//
// This app uses a two-token system:
//   - accountToken (accessToken): identifies the *user account*. Must be sent for
//     account-level operations: auth routes, profile creation, account management.
//   - profileToken: identifies the *active profile session*. Must be sent for
//     active-profile operations: dashboard data, onboarding updates, workout/nutrition APIs.
//
// Token selection rules (in priority order):
//   1. /auth/* routes → always accountToken (login, refresh, register, /me)
//   2. POST /profiles → always accountToken (profile creation is account-scoped)
//   3. PUT /profiles/:id (non-onboarding management) AND DELETE /profiles/:id
//      → always accountToken (backend requires authenticate middleware, not profileToken)
//   4. Everything else → profileToken if present, fall back to accountToken
//
// NOTE: PUT /profiles/:id for onboarding is also covered by Rule 3 because the
// accountToken is used first; if the profile was just selected, the accountToken
// should still be present. The updated onboarding flow always has accountToken set.
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const profileToken = localStorage.getItem('profileToken');
        const accountToken = localStorage.getItem('accessToken');

        const url = config.url ?? '';
        const method = (config.method ?? 'get').toLowerCase();

        // Rule 1: All /auth/* routes require accountToken (login, register, refresh, /me)
        const isAuthRoute = url.startsWith('/auth/') || url === '/auth';

        // Rule 2: POST /profiles = profile creation, account-scoped, needs accountToken
        const isCreateProfileRoute = url === '/profiles' && method === 'post';

        // Rule 3: Profile management actions (rename / delete) — account-scoped.
        // PUT /profiles/:id and DELETE /profiles/:id must use accountToken because the
        // backend `authenticate` middleware validates account JWTs only.
        // This handles the edge case where a profileToken is still in localStorage
        // from a prior session when the user opens the management mode.
        const isProfileManagementRoute =
            /^\/profiles\/[\w-]+$/.test(url) &&
            (method === 'put' || method === 'delete');

        const needsAccountToken = isAuthRoute || isCreateProfileRoute || isProfileManagementRoute;

        const token = needsAccountToken
            ? accountToken                    // account-level → force accountToken
            : (profileToken || accountToken); // session-level → prefer profileToken

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
                 if (process.env.NODE_ENV === 'development') console.warn('[API Interceptor] 404 on profile route. Clearing missing profile session:', original.url);
                 // Only clear profile-session state, NOT the accountToken.
                 // Management actions (PUT/DELETE /profiles/:id) may also return 404
                 // if the profile was already removed; we should not log the user out
                 // of their account in that case.
                 localStorage.removeItem('profileToken');
                 localStorage.removeItem('activeProfile');
                 // Only redirect if this was a profile-session endpoint (not account management)
                 const isManagementAction =
                     /\/profiles\/[\w-]+$/.test(original.url ?? '') &&
                     ['put', 'delete'].includes((original.method ?? '').toLowerCase());
                 if (!isManagementAction) {
                     window.location.href = '/profiles';
                 }
             }
             return Promise.reject(err);
        }

        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            // If we were using a profileToken, just clear it and redirect to profiles.
            //
            // BYPASS this purge for endpoints that are legitimately called during the
            // profile onboarding/update flow, where async race conditions can trigger
            // a false 401 before the token is stored or right after a profile switch.
            // Clearing the profile session on these endpoints would cause a bounce loop.
            const isOnboardingEndpoint =
                original.url?.includes('/generate') ||
                original.url?.includes('/calculate') ||
                original.url?.includes('/bmi') ||
                // PUT /profiles/:id — profile stat/goal updates during onboarding
                (original.url?.match(/^\/profiles\/[\w-]+$/) && original.method?.toLowerCase() === 'put');

            if (typeof window !== 'undefined' && localStorage.getItem('profileToken') && !isOnboardingEndpoint) {
                if (process.env.NODE_ENV === 'development') console.warn('[API Interceptor] 401 Unauthorized. Clearing invalid profile session:', original.url);
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
                if (process.env.NODE_ENV === 'development') console.warn('[API Interceptor] Refresh failed. Clearing void account access token.');
                localStorage.removeItem('accessToken');
                window.location.href = '/profiles';
            }
        }
        return Promise.reject(err);
    }
);

export default api;
