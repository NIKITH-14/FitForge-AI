'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface BMIData {
  bmi: string;
  category: string;
  ideal_weight_kg: number;
  recorded_at?: string;
}

interface ProfileData {
  weight_kg?: number;
  height_cm?: number;
  age?: number;
  gender?: string;
}

interface DietData {
  bmr?: number;
  tdee?: number;
  daily_calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
}

const BMI_COLORS: Record<string, string> = {
  Normal: '#00FF88',
  Underweight: '#00C8FF',
  Overweight: '#FFB347',
  Obese: '#FF6688',
};

const BMI_RANGES = [
  { label: 'Underweight', range: '< 18.5', color: '#00C8FF' },
  { label: 'Normal', range: '18.5 – 24.9', color: '#00FF88' },
  { label: 'Overweight', range: '25 – 29.9', color: '#FFB347' },
  { label: 'Obese', range: '≥ 30', color: '#FF6688' },
];

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD' }}>{label}</span>
      <span className="font-orbitron" style={{ fontSize: 14, fontWeight: 700, color: color ?? '#F0F4FF' }}>
        {value}
      </span>
    </div>
  );
}

export default function BodyStats() {
  const { activeProfile } = useAuth();
  const [bmi, setBmi] = useState<BMIData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [diet, setDiet] = useState<DietData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [bmiRes, userRes, dietRes] = await Promise.allSettled([
        api.get('/bmi'),
        api.get('/profiles/' + activeProfile?.id),
        api.get('/diet/plan'),
      ]);
      if (bmiRes.status === 'fulfilled') setBmi(bmiRes.value.data);
      if (userRes.status === 'fulfilled') setProfile(userRes.value.data);
      if (dietRes.status === 'fulfilled') setDiet(dietRes.value.data);
    } catch {
      setError('Failed to load body stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const bmiNum = bmi && !isNaN(parseFloat(bmi.bmi)) ? parseFloat(bmi.bmi) : 0;
  const bmiColor = bmi ? (BMI_COLORS[bmi.category] ?? '#00C8FF') : '#00C8FF';
  // Progress: 0% = 15, 100% = 40
  const bmiPct = Math.max(0, Math.min(100, ((bmiNum - 15) / 25) * 100));

  return (
    <div
      className="glass-card"
      style={{ padding: '28px 24px', transition: 'all 0.3s ease' }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(0,200,255,0.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(0,200,255,0.15)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            Body Composition
          </p>
          <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.05em' }}>
            Body Stats
          </h2>
        </div>
        {error && (
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8AAD' }}>
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 40, borderRadius: 8 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p className="font-exo2" style={{ color: '#FF6688', marginBottom: 12 }}>{error}</p>
          <button className="btn-secondary" onClick={load} style={{ fontSize: 13, padding: '8px 20px' }}>Retry</button>
        </div>
      ) : (
        <>
          {/* BMI Hero Display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '20px', borderRadius: 12,
            background: `rgba(${bmiColor === '#00FF88' ? '0,255,136' : bmiColor === '#00C8FF' ? '0,200,255' : bmiColor === '#FFB347' ? '255,179,71' : '255,102,136'},0.06)`,
            border: `1px solid ${bmiColor}22`,
            marginBottom: 20,
          }}>
            <div>
              <span className="font-orbitron" style={{ fontSize: 52, fontWeight: 900, color: bmiColor, lineHeight: 1 }}>
                {bmi?.bmi && !isNaN(Number(bmi.bmi)) ? bmi.bmi : '—'}
              </span>
              <div style={{ marginTop: 4 }}>
                <span style={{
                  display: 'inline-block',
                  background: `${bmiColor}22`, border: `1px solid ${bmiColor}44`,
                  borderRadius: 99, padding: '2px 12px',
                  fontSize: 11, color: bmiColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {bmi?.category && bmi.category !== 'NaN' ? bmi.category : '—'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {/* BMI bar */}
              <div style={{ position: 'relative', height: 6, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', marginBottom: 8 }}>
                <div style={{
                  width: `${bmiPct}%`, height: '100%', borderRadius: 99,
                  background: `linear-gradient(90deg, #00C8FF, ${bmiColor})`,
                  transition: 'width 1s ease',
                }} />
                {/* Normal zone marker */}
                <div style={{ position: 'absolute', left: '14%', top: 0, bottom: 0, width: 2, background: 'rgba(0,255,136,0.4)' }} />
                <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: 2, background: 'rgba(0,255,136,0.4)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD' }}>15</span>
                <span className="font-exo2" style={{ fontSize: 10, color: '#00FF88' }}>18.5–24.9 Normal</span>
                <span className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD' }}>40</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <StatRow label="Weight" value={profile?.weight_kg != null && !isNaN(profile.weight_kg) ? `${profile.weight_kg} kg` : '—'} />
            <StatRow label="Height" value={profile?.height_cm != null && !isNaN(profile.height_cm) ? `${profile.height_cm} cm` : '—'} />
            <StatRow label="Age" value={profile?.age != null && !isNaN(profile.age) ? `${profile.age} years` : '—'} />
            <StatRow label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—'} />
            <StatRow label="BMR" value={diet?.bmr != null && !isNaN(diet.bmr) ? `${diet.bmr} kcal/day` : '—'} color="#7B2FF7" />
            <StatRow label="TDEE" value={diet?.tdee != null && !isNaN(diet.tdee) ? `${diet.tdee} kcal/day` : '—'} color="#00C8FF" />
            <StatRow label="Daily Target" value={diet?.daily_calories != null && !isNaN(diet.daily_calories) ? `${diet.daily_calories} kcal` : '—'} color="#00FF88" />
            <StatRow label="Ideal Weight" value={bmi?.ideal_weight_kg != null && !isNaN(bmi.ideal_weight_kg) ? `${bmi.ideal_weight_kg} kg` : '—'} />
          </div>

          {/* BMI Reference */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {BMI_RANGES.map(r => (
              <div key={r.label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontFamily: 'var(--font-exo2)', color: '#7A8AAD',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <span>{r.label}: {r.range}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
