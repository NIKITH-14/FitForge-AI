'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/lib/AuthContext';
import { Activity } from 'lucide-react';

const GOAL_OPTIONS = [
  { value: 'strength', label: 'Strength', color: '#FF6432' },
  { value: 'aesthetic', label: 'Aesthetic', color: '#B06CFF' },
  { value: 'fat_loss', label: 'Fat Loss', color: '#00C8FF' },
];

export default function GuestPage() {
  const router = useRouter();
  const { setActiveProfile } = useAuth();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [goal, setGoal] = useState('fat_loss');

  // Results
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [idealWeight, setIdealWeight] = useState<number | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  const handleStartGuestSession = async () => {
    if (!heightCm || !weightKg || !age) {
        setError('Please fill out all fields.');
        return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Calculate Offline Stats locally
      const hStr = parseFloat(heightCm);
      const wStr = parseFloat(weightKg);
      const aNum = parseInt(age);
      if (hStr > 0 && wStr > 0 && aNum > 0) {
          const hMeters = hStr / 100;
          setBmi(wStr / (hMeters * hMeters));

          let calcBmr = (10 * wStr) + (6.25 * hStr) - (5 * aNum);
          calcBmr += gender === 'male' ? 5 : -161;
          
          setBmr(calcBmr);
          setTdee(calcBmr * 1.55);
          setIdealWeight(22 * (hMeters * hMeters));
      }

      // 2. Obtain guest session
      const MACHINE_SECRET = process.env.NEXT_PUBLIC_MACHINE_SECRET || 'fallback_machine_secret';
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/guest`,
        { height_cm: hStr, weight_kg: wStr, age: aNum, fitness_goal: goal, gender },
        { headers: { 'x-machine-token': MACHINE_SECRET } }
      );
      
      const { guestToken, guestId: id } = res.data;
      const guestProfile = {
        id,
        name: 'Guest',
        avatar_emoji: '👻',
        has_completed_onboarding: true,
        is_guest: true
      };
      
      sessionStorage.setItem('guestToken', guestToken);
      sessionStorage.setItem('guestId', id);
      setActiveProfile(guestProfile, guestToken);
      setGuestId(id);
      
      setStep(2);
    } catch {
      setError('Failed to start guest session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const id = guestId || sessionStorage.getItem('guestId');
    const token = sessionStorage.getItem('guestToken');
    if (id && token) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/guest/${id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch { /* best effort */ }
    }
    // Clear guest-specific sessionStorage keys
    sessionStorage.removeItem('guestToken');
    sessionStorage.removeItem('guestId');
    // profileToken and activeProfile live in localStorage — clear them here
    // so no stale profile session bleeds through after the guest exits.
    // accountToken is intentionally NOT cleared — the account session is separate
    // from the guest/profile layer and should survive a guest exit.
    localStorage.removeItem('profileToken');
    localStorage.removeItem('activeProfile');
    router.push('/profiles');
  };

  let bmiCat = 'Normal';
  let bmiColor = '#00C8FF';
  if (bmi) {
      if (bmi < 18.5) { bmiCat = 'Underweight'; bmiColor = '#00C8FF'; }
      else if (bmi < 25) { bmiCat = 'Healthy'; bmiColor = '#00FF66'; }
      else if (bmi < 30) { bmiCat = 'Overweight'; bmiColor = '#FFD700'; }
      else { bmiCat = 'Obese'; bmiColor = '#FF6688'; }
  }

  return (
    <div
      className="animate-screen-fade-in"
      style={{
        position: 'fixed', inset: 0, background: '#080810',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 40,
        overflowY: 'auto', padding: '40px 24px'
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,51,102,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,51,102,0.02) 1px, transparent 1px)`,
        backgroundSize: '60px 60px', pointerEvents: 'none',
      }} />

      {/* Guest Banner */}
      <div className="guest-banner" style={{ zIndex: 10 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#FF3366',
          boxShadow: '0 0 8px rgba(255,51,102,0.8)',
          display: 'inline-block',
          animation: 'pulse-glow 1.5s ease-in-out infinite',
        }} />
        EPHEMERAL SESSION ACTIVE
        <button
          onClick={handleSignOut}
          style={{
            background: 'rgba(255,51,102,0.2)',
            border: '1px solid rgba(255,51,102,0.4)',
            color: '#FF6688',
            padding: '6px 16px',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font-exo2)',
            fontWeight: 600,
          }}
        >
          Exit
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid rgba(255,51,102,0.3)',
            background: 'rgba(255,51,102,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px'
          }}>
            👻
          </div>
          <h1 className="font-orbitron" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.1em', color: '#F0F4FF' }}>
            {step === 1 ? 'FAST INTAKE' : 'GUEST ANALYSIS'}
          </h1>
          <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', marginTop: 4 }}>
            {step === 1 ? 'Data is wiped immediately upon exit' : 'Your temporary body metrics'}
          </p>
        </div>

        {step === 1 ? (
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 6, display: 'block' }}>Height (cm)</label>
                <input className="input-field" type="number" placeholder="175" value={heightCm} onChange={e => setHeightCm(e.target.value)} />
              </div>
              <div>
                <label className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 6, display: 'block' }}>Weight (kg)</label>
                <input className="input-field" type="number" placeholder="70" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 6, display: 'block' }}>Age</label>
                <input className="input-field" type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div>
                <label className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 6, display: 'block' }}>Gender</label>
                <select className="input-field" value={gender} onChange={e => setGender(e.target.value)} style={{ appearance: 'none' }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
              </div>
            </div>

            <label className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 6, display: 'block' }}>Training Goal</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
                {GOAL_OPTIONS.map(g => (
                    <button
                        key={g.value}
                        onClick={() => setGoal(g.value)}
                        className="font-exo2"
                        style={{
                            padding: '12px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                            background: goal === g.value ? `rgba(255,255,255,0.1)` : 'rgba(255,255,255,0.03)',
                            border: goal === g.value ? `1px solid ${g.color}` : '1px solid rgba(255,255,255,0.05)',
                            color: goal === g.value ? g.color : '#7A8AAD', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            {error && <p className="font-exo2" style={{ color: '#FF6688', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}

            <button
              className="btn-primary"
              onClick={handleStartGuestSession}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Booting Ephemeral Session...' : 'Analyze & Launch →'}
            </button>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ marginBottom: 30 }}>
                <Activity size={32} color={bmiColor} style={{ margin: '0 auto 16px' }} />
                <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current BMI</p>
                <h2 className="font-orbitron" style={{ fontSize: 48, fontWeight: 700, color: bmiColor, margin: '4px 0' }}>
                    {bmi?.toFixed(1) || '--'}
                </h2>
                <span style={{
                    background: `${bmiColor}22`, color: bmiColor, padding: '4px 12px',
                    borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-exo2)'
                }}>
                    {bmiCat}
                </span>
            </div>

            <div className="font-exo2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, textAlign: 'left' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#7A8AAD' }}>BMR</p>
                    <p style={{ fontSize: 16, color: '#F0F4FF', fontWeight: 700 }}>{bmr?.toFixed(0)} <span style={{fontSize:10, color:'#7A8AAD', fontWeight:400}}>kcal/day</span></p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#7A8AAD' }}>TDEE (Mod. Active)</p>
                    <p style={{ fontSize: 16, color: '#00C8FF', fontWeight: 700 }}>{tdee?.toFixed(0)} <span style={{fontSize:10, color:'#7A8AAD', fontWeight:400}}>kcal/day</span></p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#7A8AAD' }}>Ideal Weight</p>
                    <p style={{ fontSize: 16, color: '#00FF66', fontWeight: 700 }}>{idealWeight?.toFixed(1)} <span style={{fontSize:10, color:'#7A8AAD', fontWeight:400}}>kg</span></p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#7A8AAD' }}>Stats</p>
                    <p style={{ fontSize: 14, color: '#F0F4FF', marginTop: 2 }}>{heightCm}cm · {weightKg}kg · {age}y</p>
                </div>
            </div>

            <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', marginBottom: 24 }}>
                Your body stats have been processed client-side. No permanent records will be created.
            </p>

            <button
              className="btn-primary"
              onClick={() => router.push(`/dashboard/${guestId}`)}
              style={{ width: '100%' }}
            >
              Enter Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
