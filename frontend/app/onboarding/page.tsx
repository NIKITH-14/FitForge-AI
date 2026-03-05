'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const GOALS = [
    { id: 'strength', emoji: '💪', title: 'Strength', desc: 'Build maximal strength with heavy compound lifts' },
    { id: 'aesthetic', emoji: '🏆', title: 'Aesthetic', desc: 'Shape and define your physique with hypertrophy training' },
    { id: 'fat_loss', emoji: '🔥', title: 'Fat Loss', desc: 'Burn fat with high-rep circuit and HIIT training' },
];

const STEPS = ['Body Stats', 'Fitness Goal', 'Generating Plan'];

export default function OnboardingPage() {
    const { refreshUser } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ height_cm: '', weight_kg: '', age: '', gender: 'male', fitness_goal: '' });

    const set = (key: string, val: string) => setData((d) => ({ ...d, [key]: val }));

    const handleStats = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.height_cm || !data.weight_kg || !data.age) { toast.error('Please fill all fields'); return; }
        setStep(1);
    };

    const handleGoal = async (goal: string) => {
        setData((d) => ({ ...d, fitness_goal: goal }));
        setStep(2);
        setLoading(true);
        try {
            await api.put('/user/onboard', {
                height_cm: parseFloat(data.height_cm),
                weight_kg: parseFloat(data.weight_kg),
                age: parseInt(data.age),
                gender: data.gender,
                fitness_goal: goal,
            });
            await api.post('/bmi/calculate');
            await api.post('/diet/generate');
            await api.post('/workout/generate');
            await refreshUser();
            toast.success('Your AI plan is ready! 🎯');
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Setup failed');
            setStep(1);
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
            <div style={{ position: 'absolute', top: '15%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 560 }}>
                {/* Progress steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
                    {STEPS.map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: i <= step ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.06)', color: i <= step ? '#fff' : 'var(--text-muted)', border: i === step ? 'none' : '1px solid var(--border)', transition: 'all 0.3s' }}>
                                {i + 1}
                            </div>
                            <span style={{ fontSize: 13, color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
                            {i < STEPS.length - 1 && <div style={{ width: 40, height: 1, background: i < step ? 'var(--accent-purple)' : 'var(--border)', transition: 'all 0.3s' }} />}
                        </div>
                    ))}
                </div>

                {/* Step 0: Body Stats */}
                {step === 0 && (
                    <div className="glass-card animate-float" style={{ padding: '44px 40px' }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Tell us about yourself</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 14 }}>We&apos;ll calculate your BMI and customize everything for you</p>
                        <form onSubmit={handleStats} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Height (cm)</label>
                                    <input type="number" className="input-field" placeholder="175" min={100} max={250} value={data.height_cm} onChange={(e) => set('height_cm', e.target.value)} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Weight (kg)</label>
                                    <input type="number" className="input-field" placeholder="75" min={30} max={300} value={data.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Age</label>
                                    <input type="number" className="input-field" placeholder="25" min={10} max={100} value={data.age} onChange={(e) => set('age', e.target.value)} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Gender</label>
                                    <select className="input-field" value={data.gender} onChange={(e) => set('gender', e.target.value)}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: 8, padding: '14px' }}>Continue →</button>
                        </form>
                    </div>
                )}

                {/* Step 1: Goal selection */}
                {step === 1 && (
                    <div className="animate-float">
                        <div style={{ textAlign: 'center', marginBottom: 36 }}>
                            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Choose your goal</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your AI plan will be tailored to this objective</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {GOALS.map((g) => (
                                <button key={g.id} onClick={() => handleGoal(g.id)} className="glass-card" style={{ padding: '24px 28px', cursor: 'pointer', border: '1px solid var(--border)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 20, transition: 'all 0.3s', background: 'rgba(13,13,35,0.6)' }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#7c3aed'; (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'rgba(13,13,35,0.6)'; }}>
                                    <span style={{ fontSize: 36 }}>{g.emoji}</span>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{g.title}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{g.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Generating */}
                {step === 2 && (
                    <div className="glass-card animate-float" style={{ padding: '60px 40px', textAlign: 'center' }}>
                        <div className="animate-pulse-glow" style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: 36 }}>
                            🤖
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Building Your AI Plan</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7 }}>
                            Calculating BMI • Generating workout plan<br />Computing calorie targets • Setting up nutrition
                        </p>
                        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 8 }}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', animation: `pulse-glow 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
