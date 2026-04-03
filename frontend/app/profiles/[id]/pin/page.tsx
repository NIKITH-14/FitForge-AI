'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import axios from 'axios';

export default function PinPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.id as string;
  const { setActiveProfile } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('Profile');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the hidden input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch profile name for display
  useEffect(() => {
    const name = sessionStorage.getItem('pendingProfileName');
    if (name) setProfileName(name);
  }, []);

  const triggerError = () => {
    setShaking(true);
    setError('Incorrect PIN');
    setTimeout(() => {
      setPin('');
      setError('');
      setShaking(false);
      inputRef.current?.focus();
    }, 1200);
  };

  const submitPin = async (enteredPin: string) => {
    if (enteredPin.length !== 4) return;
    setLoading(true);
    try {
      const MACHINE_SECRET = process.env.NEXT_PUBLIC_MACHINE_SECRET || 'fallback_machine_secret';
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profiles/${profileId}/verify-pin`,
        { pin: enteredPin },
        { headers: { 'x-machine-token': MACHINE_SECRET } }
      );
      const profileData = res.data.profile;
      setActiveProfile(profileData, res.data.profileToken);
      router.push(`/dashboard/${profileData.id}`);
    } catch {
      triggerError();
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError('');
    if (val.length === 4) submitPin(val);
  };

  return (
    <div
      className="animate-screen-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#080810',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            border: `2px solid ${error ? 'rgba(255,51,102,0.5)' : 'rgba(0,200,255,0.3)'}`,
            background: error ? 'rgba(255,51,102,0.08)' : 'rgba(0,200,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 20px',
            transition: 'all 0.3s',
          }}>
            🔒
          </div>
          <h1 className="font-orbitron" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: '#F0F4FF', marginBottom: 8 }}>
            {profileName}
          </h1>
          <p className="font-exo2" style={{ fontSize: 14, color: '#7A8AAD', letterSpacing: '0.08em' }}>
            Enter your 4-digit PIN
          </p>
        </div>

        {/* PIN dots */}
        <div
          className={shaking ? 'animate-shake-x' : ''}
          style={{ display: 'flex', gap: 20, alignItems: 'center' }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`pin-dot ${pin.length > i ? (error ? 'error' : 'filled') : ''}`}
            />
          ))}
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={handleInput}
          disabled={loading || shaking}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 1,
            height: 1,
            pointerEvents: loading || shaking ? 'none' : 'all',
          }}
          autoComplete="off"
        />

        {/* Error message */}
        {error && (
          <p className="font-exo2" style={{
            fontSize: 13, color: '#FF6688',
            letterSpacing: '0.08em',
            animation: 'fadeInSub 0.3s ease',
          }}>
            {error}
          </p>
        )}

        {/* Visual keyboard hint */}
        {!error && !loading && (
          <p className="font-exo2" style={{ fontSize: 11, color: 'rgba(122,138,173,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Tap to type
          </p>
        )}

        {loading && (
          <div style={{
            width: 24, height: 24,
            border: '2px solid rgba(0,200,255,0.2)',
            borderTop: '2px solid #00C8FF',
            borderRadius: '50%',
            animation: 'spinRing 0.8s linear infinite',
          }} />
        )}

        {/* Back button */}
        <button
          onClick={() => router.push('/profiles')}
          className="font-exo2"
          style={{
            background: 'none', border: 'none',
            color: '#7A8AAD', fontSize: 13,
            cursor: 'pointer', letterSpacing: '0.1em',
            padding: '12px 24px', borderRadius: 8,
            transition: 'color 0.2s',
            minHeight: 44,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F0F4FF')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7A8AAD')}
        >
          ← Back to Profiles
        </button>
      </div>
    </div>
  );
}
