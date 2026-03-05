'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import {
    Dumbbell, Brain, Apple, LogOut, BarChart2, Play, Pause,
    Maximize2, RotateCcw, TrendingUp, Activity, Target, Flame,
    ChevronRight, Upload
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import toast from 'react-hot-toast';

const NAV = [
    { href: '/dashboard', icon: <BarChart2 className="w-4 h-4" />, label: 'Dashboard' },
    { href: '/dashboard#workout', icon: <Dumbbell className="w-4 h-4" />, label: 'Workout Plan' },
    { href: '/dashboard#nutrition', icon: <Apple className="w-4 h-4" />, label: 'Nutrition' },
    { href: '/dashboard#form', icon: <Activity className="w-4 h-4" />, label: 'Form Analysis' },
    { href: '/dashboard#ai', icon: <Brain className="w-4 h-4" />, label: 'AI Coaching' },
    { href: '/help', icon: <Play className="w-4 h-4" />, label: 'Tutorials' },
];

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [bmi, setBmi] = useState<any>(null);
    const [diet, setDiet] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [recs, setRecs] = useState<any[]>([]);
    const [foodLog, setFoodLog] = useState<any>(null);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [foodFile, setFoodFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showIntroVideo, setShowIntroVideo] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (user && !user.has_completed_intro) setShowIntroVideo(true);
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        Promise.allSettled([
            api.get('/bmi').then((r) => setBmi(r.data)),
            api.get('/diet/plan').then((r) => setDiet(r.data)),
            api.get('/workout/plan').then((r) => setPlan(r.data)),
            api.get('/machine/sessions?limit=10').then((r) => setSessions(r.data.sessions || [])),
            api.get('/ai/recommendations').then((r) => setRecs(r.data.recommendations || [])),
            api.get('/nutrition/log').then((r) => setFoodLog(r.data)),
        ]);
    }, [user]);

    const dismissIntro = async () => {
        await api.put('/user/intro-complete').catch(() => { });
        setShowIntroVideo(false);
    };

    const handleFoodUpload = async () => {
        if (!foodFile) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('food_image', foodFile);
        formData.append('meal_type', 'lunch');
        try {
            const res = await api.post('/nutrition/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Logged! ${res.data.ai_analysis?.total_calories?.toFixed(0)} kcal detected 🍽️`);
            const updated = await api.get('/nutrition/log');
            setFoodLog(updated.data);
            setFoodFile(null);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Food analysis failed');
        } finally { setUploading(false); }
    };

    const formTrendData = sessions.slice(0, 7).reverse().map((s, i) => ({
        name: `S${i + 1}`,
        score: s.avg_form_score ? parseFloat(s.avg_form_score) : 0,
        reps: s.rep_count || 0,
    }));

    const catColor = (cat: string) => ({ technique: '#f59e0b', resistance: '#10b981', volume: '#06b6d4', recovery: '#a78bfa', general: '#94a3b8' }[cat] || '#94a3b8');
    const bmiColor = (cat: string) => ({ Normal: '#10b981', Underweight: '#06b6d4', Overweight: '#f59e0b', Obese: '#ef4444' }[cat] || '#94a3b8');

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-muted)', fontSize: 18 }}>Loading your dashboard...</div>;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* ─── INTRO VIDEO MODAL ─── */}
            {showIntroVideo && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div className="glass-card" style={{ maxWidth: 720, width: '100%', padding: 32 }}>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>👋 Welcome to FitForge AI!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>Watch this quick overview to learn how to use your smart machine and get the most out of the platform.</p>
                        <div className="video-container" style={{ marginBottom: 24 }}>
                            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#0f0f2e,#1a0a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                                <div style={{ fontSize: 48 }}>🤖</div>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Platform Intro Video</p>
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>(Replace with your hosted MP4 URL in video src)</p>
                                <video ref={videoRef} style={{ display: 'none' }} onEnded={() => setVideoPlaying(false)} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.6)', alignItems: 'center' }}>
                                <button onClick={() => { videoRef.current?.play(); setVideoPlaying(true); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                                    {videoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </button>
                                <button onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); setVideoPlaying(true); } }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><RotateCcw className="w-5 h-5" /></button>
                                <div style={{ flex: 1 }} />
                                <button onClick={() => videoRef.current?.requestFullscreen?.()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><Maximize2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={dismissIntro} className="btn-primary" style={{ flex: 1, padding: '13px' }}>Got it! Take me to Dashboard →</button>
                            <button onClick={dismissIntro} className="btn-secondary" style={{ padding: '13px 20px' }}>Skip</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── SIDEBAR ─── */}
            <aside className="sidebar" style={{ width: 240, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', padding: '28px 16px', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, padding: '0 8px' }}>
                    <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Dumbbell className="w-4 h-4 text-white" />
                    </div>
                    <span className="gradient-text" style={{ fontSize: 17, fontWeight: 800 }}>FitForge AI</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    {NAV.map((n) => (
                        <a key={n.href} href={n.href} className={`sidebar-link ${activeSection === n.href.replace('/dashboard#', '') || (n.href === '/dashboard' && activeSection === 'dashboard') ? 'active' : ''}`} onClick={() => setActiveSection(n.href.replace('/dashboard#', '').replace('/dashboard', 'dashboard').replace('/help', 'help'))}>
                            {n.icon} {n.label}
                        </a>
                    ))}
                </nav>

                {/* User card at bottom */}
                {user && (
                    <div style={{ marginTop: 'auto', padding: '16px 12px', background: 'rgba(124,58,237,0.08)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'capitalize' }}>{user.fitness_goal?.replace('_', ' ') || 'Setting up...'}</div>
                        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                            <LogOut className="w-3 h-3" /> Sign Out
                        </button>
                    </div>
                )}
            </aside>

            {/* ─── MAIN CONTENT ─── */}
            <main style={{ marginLeft: 240, flex: 1, padding: '36px 40px', maxWidth: 'calc(100vw - 240px)' }}>
                {/* Header */}
                <div style={{ marginBottom: 36 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Good day, {user?.name?.split(' ')[0]} 👋</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Here&apos;s your complete fitness overview</p>
                </div>

                {/* ─── STAT CARDS ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 36 }}>
                    {[
                        { label: 'BMI Score', value: bmi?.bmi || '—', sub: bmi?.category || 'Not calculated', color: bmiColor(bmi?.category), icon: <Target className="w-5 h-5" /> },
                        { label: 'Daily Calories', value: diet?.daily_calories ? `${diet.daily_calories} kcal` : '—', sub: `Goal: ${user?.fitness_goal?.replace('_', ' ') || '—'}`, color: '#a78bfa', icon: <Flame className="w-5 h-5" /> },
                        { label: 'Workout Plan', value: plan ? `${plan.days_per_week} days/wk` : '—', sub: plan?.plan_json?.style || 'Not generated', color: '#06b6d4', icon: <Dumbbell className="w-5 h-5" /> },
                        { label: 'Sessions Logged', value: sessions.length, sub: 'Total workouts', color: '#10b981', icon: <TrendingUp className="w-5 h-5" /> },
                    ].map((s) => (
                        <div key={s.label} className="glass-card stat-card" style={{ padding: '24px 22px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
                                <div style={{ color: s.color }}>{s.icon}</div>
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* ─── FORM SCORE TREND CHART ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 36 }}>
                    <div className="glass-card" style={{ padding: '28px 24px' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity className="w-4 h-4 text-purple-400" style={{ color: '#a78bfa' }} /> Form Score Trend
                        </h2>
                        {formTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={formTrendData}>
                                    <defs>
                                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: '#13132b', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, color: '#f1f5f9' }} />
                                    <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} fill="url(#scoreGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
                                <Activity className="w-8 h-8" style={{ opacity: 0.3 }} />
                                <p style={{ fontSize: 13 }}>No session data yet. Start training!</p>
                            </div>
                        )}
                    </div>

                    {/* BMI Card */}
                    <div className="glass-card" style={{ padding: '28px 24px' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📊 BMI Analysis</h2>
                        {bmi ? (
                            <>
                                <div style={{ fontSize: 48, fontWeight: 900, color: bmiColor(bmi.category), marginBottom: 4 }}>{bmi.bmi}</div>
                                <div style={{ display: 'inline-block', background: `${bmiColor(bmi.category)}20`, border: `1px solid ${bmiColor(bmi.category)}40`, borderRadius: 99, padding: '3px 12px', fontSize: 12, color: bmiColor(bmi.category), fontWeight: 600, marginBottom: 16 }}>{bmi.category}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <div>Ideal weight: <span style={{ color: '#a78bfa', fontWeight: 600 }}>{bmi.ideal_weight_kg} kg</span></div>
                                    <div>Healthy range: <span style={{ color: 'var(--text-primary)' }}>18.5 – 24.9</span></div>
                                </div>
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Complete onboarding to see BMI analysis</div>
                        )}
                    </div>
                </div>

                {/* ─── NUTRITION SECTION ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 36 }} id="nutrition">
                    <div className="glass-card" style={{ padding: '28px 24px' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🥗 Today&apos;s Nutrition</h2>
                        {diet && foodLog ? (
                            <>
                                {[
                                    { label: 'Calories', consumed: foodLog.totals?.calories || 0, target: diet.daily_calories, color: '#7c3aed', unit: 'kcal' },
                                    { label: 'Protein', consumed: foodLog.totals?.protein || 0, target: diet.protein_g, color: '#10b981', unit: 'g' },
                                    { label: 'Carbs', consumed: foodLog.totals?.carbs || 0, target: diet.carbs_g, color: '#06b6d4', unit: 'g' },
                                    { label: 'Fat', consumed: foodLog.totals?.fat || 0, target: diet.fat_g, color: '#f59e0b', unit: 'g' },
                                ].map((macro) => (
                                    <div key={macro.label} style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{macro.label}</span>
                                            <span style={{ fontWeight: 600 }}>{macro.consumed.toFixed(0)} / {macro.target} {macro.unit}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${Math.min(100, (macro.consumed / macro.target) * 100)}%`, background: `linear-gradient(90deg, ${macro.color}, ${macro.color}aa)` }} />
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Generate your diet plan to track nutrition</div>
                        )}
                    </div>

                    {/* Food Upload */}
                    <div className="glass-card" style={{ padding: '28px 24px' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>📸 Log Meal with AI</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Snap a photo — Gemini Vision will detect food and log your macros automatically</p>
                        <div
                            style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', marginBottom: 16 }}
                            onClick={() => fileInputRef.current?.click()}
                            onMouseEnter={(e) => { (e.currentTarget).style.borderColor = '#7c3aed'; (e.currentTarget).style.background = 'rgba(124,58,237,0.05)'; }}
                            onMouseLeave={(e) => { (e.currentTarget).style.borderColor = 'var(--border)'; (e.currentTarget).style.background = 'transparent'; }}
                        >
                            <Upload className="w-8 h-8" style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
                            {foodFile ? (
                                <p style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>✓ {foodFile.name}</p>
                            ) : (
                                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to upload meal photo</p>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setFoodFile(e.target.files?.[0] || null)} />
                        <button
                            onClick={handleFoodUpload}
                            disabled={!foodFile || uploading}
                            className="btn-primary"
                            style={{ width: '100%', padding: '12px' }}
                        >
                            {uploading ? 'Analyzing with AI...' : '🍽️ Analyze & Log Meal'}
                        </button>
                    </div>
                </div>

                {/* ─── WORKOUT PLAN PREVIEW ─── */}
                <div className="glass-card" style={{ padding: '28px 24px', marginBottom: 36 }} id="workout">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700 }}>💪 Current Workout Plan</h2>
                        {plan && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plan.plan_json?.style} • {plan.days_per_week}x/week</span>}
                    </div>
                    {plan?.plan_json?.schedule ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                            {Object.entries(plan.plan_json.schedule as Record<string, any[]>).map(([day, exercises]) => (
                                <div key={day} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day}</div>
                                    {exercises.slice(0, 3).map((ex: any) => (
                                        <div key={ex.exercise} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                            • {ex.exercise} <span style={{ color: 'var(--text-primary)' }}>{ex.sets}×{ex.reps}</span>
                                        </div>
                                    ))}
                                    {exercises.length > 3 && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4 }}>+{exercises.length - 3} more</div>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                            <Dumbbell className="w-10 h-10" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>Complete onboarding to generate your plan</p>
                        </div>
                    )}
                </div>

                {/* ─── AI RECOMMENDATIONS ─── */}
                <div className="glass-card" style={{ padding: '28px 24px', marginBottom: 36 }} id="ai">
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Brain className="w-4 h-4" style={{ color: '#a78bfa' }} /> AI Coaching Recommendations
                    </h2>
                    {recs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {recs.slice(0, 5).map((rec) => (
                                <div key={rec.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${catColor(rec.category)}30` }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(rec.category), marginTop: 5, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 11, color: catColor(rec.category), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{rec.category}</div>
                                        <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{rec.recommendation_text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                            <Brain className="w-9 h-9" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>Complete your first training session to unlock personalized AI coaching</p>
                        </div>
                    )}
                </div>

                {/* ─── RECENT SESSIONS ─── */}
                <div className="glass-card" style={{ padding: '28px 24px' }} id="form">
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🏋️ Recent Training Sessions</h2>
                    {sessions.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {['Exercise', 'Reps', 'Resistance', 'Duration', 'Form Score', 'Date'].map((h) => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.slice(0, 8).map((s) => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '12px 12px', fontWeight: 600 }}>{s.exercise_name}</td>
                                            <td style={{ padding: '12px 12px', color: '#a78bfa' }}>{s.rep_count}</td>
                                            <td style={{ padding: '12px 12px' }}>{s.resistance_kg} kg</td>
                                            <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>{Math.round(s.duration_s / 60)} min</td>
                                            <td style={{ padding: '12px 12px' }}>
                                                {s.avg_form_score != null ? (
                                                    <span style={{ color: s.avg_form_score > 75 ? '#10b981' : s.avg_form_score > 50 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                                                        {parseFloat(s.avg_form_score).toFixed(0)}/100
                                                    </span>
                                                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>{new Date(s.timestamp).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                            <Activity className="w-9 h-9" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>No sessions yet. Connect your smart machine and start training!</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
