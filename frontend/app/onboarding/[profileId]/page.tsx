'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const GOALS = [
  { id: 'strength', emoji: '💪', title: 'Strength', desc: 'Build maximal strength with heavy compound lifts', color: '#FF6432' },
  { id: 'aesthetic', emoji: '🏆', title: 'Aesthetic', desc: 'Shape and define your physique with hypertrophy training', color: '#B06CFF' },
  { id: 'fat_loss', emoji: '🔥', title: 'Fat Loss', desc: 'Burn fat with high-rep circuit and HIIT training', color: '#00C8FF' },
];

const STEPS = ['Body Stats', 'Fitness Goal', 'Generating Plan'];

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.profileId as string;
  const { refreshUser, activeProfile, setActiveProfile, profileToken } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    height_cm: '',
    weight_kg: '',
    age: '',
    gender: 'male',
    fitness_goal: '',
  });

  const set = (key: string, val: string) => setData(d => ({ ...d, [key]: val }));

  const handleStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.height_cm || !data.weight_kg || !data.age) {
      toast.error('Please fill all fields');
      return;
    }
    setStep(1);
  };

  const handleGoal = async (goal: string) => {
    setData(d => ({ ...d, fitness_goal: goal }));
    setStep(2);
    setLoading(true);
    try {
      const pid = profileId || activeProfile?.id;
      if (pid) {
        const updateRes = await api.put(`/profiles/${pid}`, {
          height_cm: parseFloat(data.height_cm),
          weight_kg: parseFloat(data.weight_kg),
          age: parseInt(data.age),
          gender: data.gender,
          fitness_goal: goal,
        });
        
        // Cache the newly validated completion profile token and profile object
        if (updateRes.data?.profile && updateRes.data?.profileToken) {
          setActiveProfile(updateRes.data.profile, updateRes.data.profileToken);
        }
      }
      await Promise.allSettled([
        api.post('/bmi/calculate'),
        api.post('/diet/generate'),
        api.post('/workout/generate'),
      ]);
      toast.success('Your AI plan is ready! 🎯');
      router.push(`/dashboard/${pid}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Setup failed. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080810',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Bg glow */}
      <div style={{
        position: 'fixed', top: '15%', left: '20%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,47,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 2 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 className="font-orbitron" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.3em', color: '#F0F4FF', marginBottom: 6 }}>
            FITFORGE
          </h1>
          <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            Profile Setup — {activeProfile?.name ?? 'New Profile'}
          </p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: i < step ? 'rgba(123,47,247,0.4)' : i === step ? 'linear-gradient(135deg,#7B2FF7,#00C8FF)' : 'rgba(255,255,255,0.06)',
                  color: i <= step ? '#fff' : '#7A8AAD',
                  border: i === step ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.3s',
                  fontFamily: 'var(--font-orbitron)',
                }}>
                  {i + 1}
                </div>
                <span className="font-exo2" style={{ fontSize: 11, color: i <= step ? '#F0F4FF' : '#7A8AAD', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 60, height: 1, background: i < step ? '#7B2FF7' : 'rgba(255,255,255,0.08)', margin: '0 8px', marginBottom: 20, transition: 'all 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Body Stats */}
        {step === 0 && (
          <div className="glass-card animate-float" style={{ padding: '44px 40px' }}>
            <h2 className="font-exo2" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#F0F4FF' }}>
              Tell us about yourself
            </h2>
            <p className="font-exo2" style={{ color: '#7A8AAD', marginBottom: 32, fontSize: 14 }}>
              We'll calculate your BMI and customize everything for you.
            </p>
            <form onSubmit={handleStats} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', display: 'block', marginBottom: 8, fontWeight: 500 }}>Height (cm)</label>
                  <input type="number" className="input-field" placeholder="175" min={100} max={250} value={data.height_cm} onChange={e => set('height_cm', e.target.value)} required />
                </div>
                <div>
                  <label className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', display: 'block', marginBottom: 8, fontWeight: 500 }}>Weight (kg)</label>
                  <input type="number" className="input-field" placeholder="75" min={30} max={300} value={data.weight_kg} onChange={e => set('weight_kg', e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', display: 'block', marginBottom: 8, fontWeight: 500 }}>Age</label>
                  <input type="number" className="input-field" placeholder="25" min={10} max={100} value={data.age} onChange={e => set('age', e.target.value)} required />
                </div>
                <div>
                  <label className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', display: 'block', marginBottom: 8, fontWeight: 500 }}>Gender</label>
                  <select className="input-field" value={data.gender} onChange={e => set('gender', e.target.value)}>
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
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 className="font-exo2" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#F0F4FF' }}>Choose your goal</h2>
              <p className="font-exo2" style={{ color: '#7A8AAD', fontSize: 14 }}>Your AI plan will be tailored to this objective.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleGoal(g.id)}
                  disabled={loading}
                  className="glass-card"
                  style={{
                    padding: '22px 28px', cursor: loading ? 'not-allowed' : 'pointer',
                    border: `1px solid rgba(255,255,255,0.06)`,
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 20,
                    transition: 'all 0.25s', background: 'rgba(13,13,26,0.6)',
                    minHeight: 44,
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = g.color + '66';
                    e.currentTarget.style.background = g.color + '0D';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.background = 'rgba(13,13,26,0.6)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: 36 }}>{g.emoji}</span>
                  <div>
                    <div className="font-exo2" style={{ fontSize: 18, fontWeight: 700, color: '#F0F4FF', marginBottom: 4 }}>{g.title}</div>
                    <div className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD' }}>{g.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: g.color, boxShadow: `0 0 8px ${g.color}` }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === 2 && (
          <div className="glass-card animate-float" style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div className="animate-pulse-glow" style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7B2FF7, #00C8FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px', fontSize: 36,
            }}>
              🤖
            </div>
            <h2 className="font-orbitron" style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, letterSpacing: '0.05em', color: '#F0F4FF' }}>
              Building Your AI Plan
            </h2>
            <p className="font-exo2" style={{ color: '#7A8AAD', fontSize: 14, lineHeight: 1.8 }}>
              Calculating BMI · Generating workout plan<br />Computing calorie targets · Setting up nutrition
            </p>
            <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#7B2FF7',
                  animation: `pulse-glow 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
