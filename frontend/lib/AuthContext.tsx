'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    fitness_goal?: string;
    has_completed_intro?: boolean;
    height_cm?: number;
    weight_kg?: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) { setLoading(false); return; }
        try {
            const res = await api.get('/user/me');
            setUser(res.data);
        } catch {
            localStorage.removeItem('accessToken');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUser(); }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', res.data.accessToken);
        setUser(res.data.user);
    };

    const register = async (name: string, email: string, password: string) => {
        const res = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('accessToken', res.data.accessToken);
        setUser(res.data.user);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        api.post('/auth/logout').catch(() => { });
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
