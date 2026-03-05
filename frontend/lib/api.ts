import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                const newToken = res.data.accessToken;
                localStorage.setItem('accessToken', newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch {
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

export default api;
