'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Play, Pause, Maximize2, RotateCcw, ChevronRight, Dumbbell, Brain, Apple, Zap } from 'lucide-react';

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const replay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setPlaying(true);
  };

  const fullscreen = () => { videoRef.current?.requestFullscreen?.(); };

  const features = [
    { icon: <Dumbbell className="w-6 h-6" />, title: 'Smart Machine Integration', desc: 'Real-time rep counting, resistance measurement, and time under tension tracking via your custom gym machine.' },
    { icon: <Brain className="w-6 h-6" />, title: 'AI Form Analysis', desc: 'MediaPipe pose detection analyzes joint angles per rep, scores your form 0–100 and gives corrective feedback.' },
    { icon: <Zap className="w-6 h-6" />, title: 'Personalized Plans', desc: 'Goal-based workout plans generated instantly — Strength, Aesthetic, or Fat Loss — updated as you progress.' },
    { icon: <Apple className="w-6 h-6" />, title: 'Nutrition Intelligence', desc: 'Snap a photo of your meal. Gemini Vision AI detects food, estimates portions, and logs calories and macros automatically.' },
  ];

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ─── NAV ─── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }} className="gradient-text">FitForge AI</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/login"><button className="btn-secondary" style={{ padding: '10px 22px', fontSize: 14 }}>Sign In</button></Link>
          <Link href="/register"><button className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>Get Started</button></Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ textAlign: 'center', padding: '100px 48px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '15%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="animate-float" style={{ display: 'inline-block', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 99, padding: '6px 18px', fontSize: 13, color: '#a78bfa', marginBottom: 24, fontWeight: 600, letterSpacing: '0.5px' }}>
          🚀 AI-POWERED SMART GYM PLATFORM
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 24 }}>
          Train Smarter.<br />
          <span className="gradient-text">Go Beyond Limits.</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7 }}>
          The world&apos;s first AI fitness coach integrated with a custom smart gym machine.
          Real-time form correction, personalized plans, and intelligent nutrition tracking.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register">
            <button className="btn-primary animate-pulse-glow" style={{ padding: '15px 36px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              Start Training Free <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
          <button onClick={togglePlay} className="btn-secondary" style={{ padding: '15px 36px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play className="w-4 h-4" /> Watch Demo
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 64, marginTop: 72, flexWrap: 'wrap' }}>
          {[['10,000+', 'Active Users'], ['98%', 'Form Accuracy'], ['3x', 'Faster Progress'], ['50+', 'Exercises']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800 }} className="gradient-text">{val}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── VIDEO SECTION ─── */}
      <section style={{ padding: '60px 48px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 12 }}>See It In Action</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40 }}>Watch how FitForge AI transforms your training experience</p>

        <div className="glass-card" style={{ padding: 4 }}>
          <div className="video-container" style={{ borderRadius: 14 }}>
            {/* Placeholder gradient video area — replace src with your actual video URL */}
            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #0f0f2e, #1a0a3e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid rgba(124,58,237,0.5)' }} onClick={togglePlay}>
                {playing ? <Pause className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white" style={{ marginLeft: 4 }} />}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>FitForge AI — Platform Overview</p>
              <video
                ref={videoRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }}
                onEnded={() => setPlaying(false)}
              // src="/videos/intro.mp4"  ← replace with your hosted video URL
              />
            </div>
            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(0,0,0,0.6)', alignItems: 'center' }}>
              <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={replay} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                <RotateCcw className="w-5 h-5" />
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={fullscreen} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{ padding: '60px 48px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Everything You Need</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 56 }}>A complete ecosystem for intelligent fitness training</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {features.map((f) => (
            <div key={f.title} className="glass-card stat-card animate-float" style={{ padding: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', marginBottom: 18 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ textAlign: 'center', padding: '60px 48px 100px' }}>
        <div className="glass-card" style={{ maxWidth: 700, margin: '0 auto', padding: '60px 40px', background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))' }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px', marginBottom: 16 }}>Ready to Forge<br /><span className="gradient-text">Your Best Body?</span></h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 36, fontSize: 16 }}>Join thousands of athletes training smarter with AI.</p>
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '16px 48px', fontSize: 17 }}>Create Free Account →</button>
          </Link>
        </div>
      </section>
    </main>
  );
}
