'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    has_completed_intro?: boolean;
}

interface Profile {
    id: string;
    name: string;
    avatar_emoji?: string;
    fitness_goal?: string;
    has_completed_onboarding?: boolean;
    is_admin?: boolean;
    has_pin?: boolean;
    is_guest?: boolean;
}

interface AuthContextType {
    // Layer 1: Account
    user: User | null;
    accountToken: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    switchProfile: () => void;
    fullLogout: () => void;
    refreshUser: () => void;
    // Layer 2: Profile
    activeProfile: Profile | null;
    profileToken: string | null;
    setActiveProfile: (profile: Profile, token: string) => void;
    clearProfile: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accountToken, setAccountToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
    const [profileToken, setProfileToken] = useState<string | null>(null);

    const loadUser = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) { setLoading(false); return; }
        setAccountToken(token);
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch {
            localStorage.removeItem('accessToken');
            setAccountToken(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Restore profile from localStorage on mount
        const savedProfile = localStorage.getItem('activeProfile');
        const savedProfileToken = localStorage.getItem('profileToken');
        if (savedProfile && savedProfileToken) {
            try {
                setActiveProfileState(JSON.parse(savedProfile));
                setProfileToken(savedProfileToken);
            } catch {
                localStorage.removeItem('activeProfile');
                localStorage.removeItem('profileToken');
            }
        }
        loadUser();
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const token = res.data.accessToken;
        localStorage.setItem('accessToken', token);
        setAccountToken(token);
        setUser(res.data.user);
    };

    const register = async (name: string, email: string, password: string) => {
        const res = await api.post('/auth/register', { name, email, password });
        const token = res.data.accessToken;
        localStorage.setItem('accessToken', token);
        setAccountToken(token);
        setUser(res.data.user);
    };

    const switchProfile = () => {
        localStorage.removeItem('profileToken');
        localStorage.removeItem('activeProfile');
        setProfileToken(null);
        setActiveProfileState(null);
        window.location.href = '/profiles';
    };

    const fullLogout = () => {
        localStorage.removeItem('profileToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('activeProfile');
        setAccountToken(null);
        setUser(null);
        setProfileToken(null);
        setActiveProfileState(null);
        window.location.href = '/setup';
    };

    const setActiveProfile = (profile: Profile, token: string) => {
        localStorage.setItem('activeProfile', JSON.stringify(profile));
        localStorage.setItem('profileToken', token);
        setActiveProfileState(profile);
        setProfileToken(token);
    };

    const clearProfile = () => {
        localStorage.removeItem('activeProfile');
        localStorage.removeItem('profileToken');
        setActiveProfileState(null);
        setProfileToken(null);
    };

    return (
        <AuthContext.Provider value={{
            user, accountToken, loading,
            login, register, switchProfile, fullLogout, refreshUser: loadUser,
            activeProfile, profileToken, setActiveProfile, clearProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
