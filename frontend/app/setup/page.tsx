'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import axios from 'axios';
import { Suspense } from 'react';

const AVATAR_OPTIONS = ['💪', '🏋️', '🔥', '⚡', '🚀', '🦁', '🐉', '🌊', '🎯', '🌟', '🏆', '💎'];
const GOAL_OPTIONS = [
  { value: 'strength', label: 'Strength', desc: 'Build raw power & muscle mass', icon: '💪', color: '#FF6432' },
  { value: 'aesthetic', label: 'Aesthetic', desc: 'Shape & define your physique', icon: '✨', color: '#B06CFF' },
  { value: 'fat_loss', label: 'Fat Loss', desc: 'Burn fat, stay lean', icon: '🔥', color: '#00C8FF' },
];

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams?.get('mode') ?? 'first-boot';
  const { register, setActiveProfile } = useAuth();

  const [step, setStep] = useState(mode === 'add-profile' ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // We store the fresh account token here so we can pass it explicitly to profile creation
  const [freshToken, setFreshToken] = useState<string | null>(null);

  // Step 1 — Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — Profile
  const [profileName, setProfileName] = useState('');
  const [avatar, setAvatar] = useState('💪');
  const [goal, setGoal] = useState('');
  const [pin, setPin] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      // Call register API directly so we can capture the token immediately
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/register`,
        { name, email, password }
      );
      const token = res.data.accessToken;
      localStorage.setItem('accessToken', token);
      setFreshToken(token);
      setStep(2);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!profileName || !goal) { setError('Please fill in profile name and goal'); return; }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { name: profileName, avatar_emoji: avatar, fitness_goal: goal };
      if (pin && pin.length === 4) payload.pin = pin;
      // Use the freshToken we captured from register, or fall back to localStorage
      const token = freshToken || localStorage.getItem('accessToken');
      if (!token) {
        setError('Not authenticated. Please go back and create an account first.');
        return;
      }
      const profileRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profiles`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const createdProfileId = profileRes.data?.profile?.id || profileRes.data?.id;
      if (!createdProfileId) {
        router.push('/profiles');
      } else {
        // Auto-select so AuthContext has profileToken for onboarding
        try {
            const selectRes = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profiles/${createdProfileId}/select-account`,
              {},
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (selectRes.data?.profileToken) {
              setActiveProfile(selectRes.data.profile, selectRes.data.profileToken);
            }
        } catch (e: any) {
             if (e.response?.status === 403 && pin) {
                 const verifyRes = await axios.post(
                   `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profiles/${createdProfileId}/verify-pin-account`,
                   { pin },
                   { headers: { 'Authorization': `Bearer ${token}` } }
                 );
                 if (verifyRes.data?.profileToken) {
                    setActiveProfile(verifyRes.data.profile, verifyRes.data.profileToken);
                 }
             } else {
                 throw e;
             }
        }
        
        // Set up this profile's body stats / goals
        router.push(`/onboarding/${createdProfileId}`);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Profile creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animate-screen-fade-in"
      style={{
        position: 'fixed', inset: 0,
        background: '#080810',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'auto', padding: '40px 24px',
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '60px 60px', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 className="font-orbitron" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.3em', color: '#F0F4FF', marginBottom: 6 }}>
            FITFORGE
          </h1>
          <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', letterSpacing: '0.3em' }}>
            {step === 1 ? 'CREATE ACCOUNT' : 'SETUP PROFILE'}
          </p>
        </div>

        {/* Step indicator */}
        {mode !== 'add-profile' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
            {[1, 2].map(s => (
              <div key={s} className={`step-dot ${s === step ? 'active' : s < step ? 'done' : ''}`} />
            ))}
          </div>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <div className="glass-card" style={{ padding: 36 }}>
            <h2 className="font-exo2" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#F0F4FF' }}>
              Create Your Account
            </h2>
            <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', marginBottom: 28 }}>
              Set up your FitForge account to get started
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input-field" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="input-field" type="password" placeholder="Password (8+ chars)" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && <p className="font-exo2" style={{ color: '#FF6688', fontSize: 13, marginTop: 12 }}>{error}</p>}

            <button
              className="btn-primary"
              onClick={handleRegister}
              disabled={loading}
              style={{ width: '100%', marginTop: 28 }}
            >
              {loading ? 'Creating Account...' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Step 2: Profile */}
        {step === 2 && (
          <div className="glass-card" style={{ padding: 36 }}>
            <h2 className="font-exo2" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#F0F4FF' }}>
              {mode === 'add-profile' ? 'Add a Profile' : 'Set Up Your Profile'}
            </h2>
            <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', marginBottom: 28 }}>
              Profiles let multiple people share one machine
            </p>

            {/* Avatar picker */}
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', marginBottom: 12, textTransform: 'uppercase' }}>
              Choose Avatar
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {AVATAR_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setAvatar(em)}
                  style={{
                    width: 44, height: 44,
                    borderRadius: '50%',
                    border: avatar === em ? '2px solid #00C8FF' : '2px solid rgba(0,200,255,0.1)',
                    background: avatar === em ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.04)',
                    fontSize: 20, cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: avatar === em ? '0 0 10px rgba(0,200,255,0.3)' : 'none',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Profile name */}
            <input
              className="input-field"
              placeholder="Display Name (e.g. Eshwar)"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              style={{ marginBottom: 24 }}
            />

            {/* Fitness goal */}
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', marginBottom: 12, textTransform: 'uppercase' }}>
              Training Goal
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: goal === g.value ? `2px solid ${g.color}` : '2px solid rgba(255,255,255,0.06)',
                    background: goal === g.value ? `rgba(${g.color === '#FF6432' ? '255,100,50' : g.color === '#B06CFF' ? '176,108,255' : '0,200,255'},0.08)` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{g.icon}</span>
                  <div>
                    <div className="font-exo2" style={{ fontWeight: 700, color: '#F0F4FF', fontSize: 15 }}>{g.label}</div>
                    <div className="font-exo2" style={{ color: '#7A8AAD', fontSize: 12 }}>{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Optional PIN */}
            <input
              className="input-field"
              type="tel"
              inputMode="numeric"
              maxLength={4}
              placeholder="Optional 4-digit PIN (for privacy)"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ marginBottom: 4 }}
            />
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', marginBottom: 24 }}>
              Leave blank for no PIN
            </p>

            {error && <p className="font-exo2" style={{ color: '#FF6688', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              {mode !== 'add-profile' && (
                <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  ← Back
                </button>
              )}
              <button
                className="btn-primary"
                onClick={handleCreateProfile}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? 'Creating...' : mode === 'add-profile' ? 'Add Profile' : 'Get Started →'}
              </button>
            </div>
          </div>
        )}

        {/* Link to login for existing users */}
        {step === 1 && mode !== 'add-profile' && (
          <p className="font-exo2" style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#7A8AAD' }}>
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: '#00C8FF', cursor: 'pointer', fontSize: 13 }}
            >
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div style={{ background: '#080810', height: '100vh' }} />}>
      <SetupForm />
    </Suspense>
  );
}
