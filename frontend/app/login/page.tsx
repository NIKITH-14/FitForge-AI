'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import { Dumbbell, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back! 💪');
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
            <div style={{ position: 'absolute', top: '20%', left: '30%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="glass-card animate-float" style={{ width: '100%', maxWidth: 440, padding: '48px 40px' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    <span className="gradient-text" style={{ fontSize: 22, fontWeight: 800 }}>FitForge AI</span>
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Welcome back</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 14 }}>Sign in to continue your training journey</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail className="w-4 h-4" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                className="input-field"
                                style={{ paddingLeft: 40 }}
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock className="w-4 h-4" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="input-field"
                                style={{ paddingLeft: 40, paddingRight: 44 }}
                                placeholder="Your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: 8, padding: '14px' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In →'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 14 }}>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Create one →</Link>
                </p>
            </div>
        </div>
    );
}
