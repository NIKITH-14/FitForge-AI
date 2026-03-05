'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Dumbbell, Play, Pause, RotateCcw, Maximize2, ChevronLeft } from 'lucide-react';

const TUTORIALS = [
    { id: 1, title: 'Getting Started with FitForge AI', duration: '3:45', desc: 'Platform overview, account setup, and connecting your smart machine.', emoji: '🚀' },
    { id: 2, title: 'How the Smart Machine Works', duration: '5:20', desc: 'Rep counting, resistance measurement, and data transmission to the app.', emoji: '🦾' },
    { id: 3, title: 'AI Form Correction Explained', duration: '4:10', desc: 'How MediaPipe pose detection analyzes your movement and scores form 0–100.', emoji: '🎯' },
    { id: 4, title: 'Reading Your Workout Plan', duration: '2:30', desc: 'Understanding sets, reps, rest times, and weekly progression schedules.', emoji: '📋' },
    { id: 5, title: 'Nutrition & Food Photo Tracking', duration: '3:00', desc: 'How to photograph meals and let Gemini AI auto-log your macros.', emoji: '🍽️' },
    { id: 6, title: 'Interpreting AI Recommendations', duration: '2:45', desc: 'Understanding coaching suggestions for resistance, volume, and recovery.', emoji: '🤖' },
];

export default function HelpPage() {
    const [active, setActive] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const toggle = () => {
        if (!videoRef.current) return;
        if (playing) { videoRef.current.pause(); setPlaying(false); }
        else { videoRef.current.play(); setPlaying(true); }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 48px' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Dumbbell className="w-4 h-4 text-white" />
                        </div>
                        <span className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>FitForge AI</span>
                    </div>
                </div>

                <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>Tutorial Center</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 48, fontSize: 15 }}>Everything you need to master your smart gym platform</p>

                {/* Video Player */}
                {active !== null && (
                    <div className="glass-card animate-float" style={{ marginBottom: 40, padding: 4 }}>
                        <div className="video-container" style={{ borderRadius: 14 }}>
                            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#0f0f2e,#1a0a3e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                                <span style={{ fontSize: 56 }}>{TUTORIALS.find(t => t.id === active)?.emoji}</span>
                                <p style={{ fontSize: 18, fontWeight: 700 }}>{TUTORIALS.find(t => t.id === active)?.title}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Replace video src with your hosted clip URL</p>
                                <div onClick={toggle} style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: 8 }}>
                                    {playing ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white" style={{ marginLeft: 3 }} />}
                                </div>
                                <video ref={videoRef} style={{ display: 'none' }} onEnded={() => setPlaying(false)} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, padding: '10px 16px', background: 'rgba(0,0,0,0.6)', alignItems: 'center' }}>
                                <button onClick={toggle} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </button>
                                <button onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); setPlaying(true); } }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><RotateCcw className="w-5 h-5" /></button>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{TUTORIALS.find(t => t.id === active)?.duration}</span>
                                <div style={{ flex: 1 }} />
                                <button onClick={() => videoRef.current?.requestFullscreen?.()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><Maximize2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tutorial Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
                    {TUTORIALS.map((t) => (
                        <div
                            key={t.id}
                            className="glass-card"
                            style={{ padding: '24px', cursor: 'pointer', border: `1px solid ${active === t.id ? 'rgba(124,58,237,0.6)' : 'var(--border)'}`, background: active === t.id ? 'rgba(124,58,237,0.08)' : 'rgba(13,13,35,0.6)', transition: 'all 0.3s' }}
                            onClick={() => { setActive(t.id); setPlaying(false); }}
                            onMouseEnter={(e) => { if (active !== t.id) (e.currentTarget).style.borderColor = 'rgba(124,58,237,0.4)'; }}
                            onMouseLeave={(e) => { if (active !== t.id) (e.currentTarget).style.borderColor = 'var(--border)'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                <span style={{ fontSize: 32 }}>{t.emoji}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.15)', borderRadius: 99, padding: '4px 12px' }}>
                                    <Play className="w-3 h-3" style={{ color: '#a78bfa' }} />
                                    <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>{t.duration}</span>
                                </div>
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{t.title}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
