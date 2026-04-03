'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BootScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'booting' | 'fading'>('booting');
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // After 2.5s progress + 0.3s buffer → start fade-out
    const fadeTimer = setTimeout(() => {
      setPhase('fading');
    }, 2800);

    // After fade completes → navigate
    const navTimer = setTimeout(() => {
      const accountToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (accountToken) {
        router.push('/profiles');
      } else {
        router.push('/setup');
      }
    }, 3350);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#080810',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Background grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,47,247,0.08) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Center content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        position: 'relative',
        zIndex: 2,
      }}>

        {/* Logo + Ring */}
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          {/* Spinning gradient ring */}
          <div
            className="animate-spin-ring"
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #00C8FF, #7B2FF7, #00C8FF 60%, transparent 60%)',
              padding: 3,
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#080810',
            }} />
          </div>

          {/* Logo hexagon */}
          <div
            className="animate-boot-glow"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0,200,255,0.15), rgba(123,47,247,0.2))',
              border: '1px solid rgba(0,200,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              {/* Hexagon */}
              <polygon
                points="26,4 46,15 46,37 26,48 6,37 6,15"
                stroke="#00C8FF"
                strokeWidth="1.5"
                fill="rgba(0,200,255,0.08)"
              />
              {/* Lightning bolt / F mark */}
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle"
                fill="#00C8FF" fontSize="22" fontWeight="900"
                style={{ fontFamily: 'Orbitron, sans-serif' }}>
                F
              </text>
            </svg>
          </div>
        </div>

        {/* Title block */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1
            className="animate-fade-up-title font-orbitron"
            style={{
              fontSize: 42,
              fontWeight: 900,
              letterSpacing: '0.5em',
              color: '#F0F4FF',
              textShadow: '0 0 40px rgba(0,200,255,0.4)',
              animationDelay: '0.3s',
            }}
          >
            FITFORGE
          </h1>

          <p
            className="animate-fade-in-sub font-exo2"
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.35em',
              color: '#00C8FF',
              textTransform: 'uppercase',
              animationDelay: '0.7s',
              opacity: 0,
            }}
          >
            AI-POWERED GYM OS
          </p>
        </div>

        {/* Progress bar */}
        <div style={{
          width: 280,
          height: 2,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 99,
          overflow: 'hidden',
          animationDelay: '0.5s',
        }}>
          <div
            ref={progressRef}
            style={{
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #7B2FF7, #00C8FF)',
              width: 0,
              animation: 'bootProgress 2.5s linear 0.5s forwards',
              boxShadow: '0 0 12px rgba(0,200,255,0.6)',
            }}
          />
        </div>

        {/* Status text */}
        <p
          className="animate-fade-in-sub font-exo2"
          style={{
            fontSize: 11,
            color: 'rgba(122,138,173,0.7)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            animationDelay: '0.9s',
            opacity: 0,
          }}
        >
          Initializing System
        </p>
      </div>
    </div>
  );
}
