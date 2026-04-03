'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import { Dumbbell, Apple, RefreshCw, TrendingUp, Zap, Scale } from 'lucide-react';

interface BMIData {
  bmi: string;
  category: string;
  ideal_weight_kg: number;
}

interface ProfileData {
  weight_kg?: number;
  height_cm?: number;
}

interface DietData {
  bmr?: number;
  tdee?: number;
  daily_calories?: number;
}

interface HeroBannerProps {
  onNavigate: (section: string) => void;
}

const BMI_COLORS: Record<string, string> = {
  Normal: '#00FF88',
  Underweight: '#00C8FF',
  Overweight: '#FFB347',
  Obese: '#FF6688',
};

function SkeletonBlock({ width, height }: { width: string | number; height: string | number }) {
  return (
    <div className="shimmer" style={{ width, height, borderRadius: 8 }} />
  );
}

export default function HeroBanner({ onNavigate }: HeroBannerProps) {
  const { activeProfile } = useAuth();
  const [bmi, setBmi] = useState<BMIData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [diet, setDiet] = useState<DietData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = activeProfile?.name?.split(' ')[0] || 'Athlete';

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
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const bmiColor = bmi ? (BMI_COLORS[bmi.category] ?? '#00C8FF') : '#00C8FF';

  return (
    <div
      className="animate-float"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        marginBottom: 32,
        alignItems: 'start',
      }}
    >
      {/* Left: Greeting + CTAs */}
      <div>
        <p
          className="font-exo2"
          style={{ fontSize: 12, color: '#7A8AAD', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}
        >
          {getGreeting()}
        </p>
        <h1
          className="font-orbitron"
          style={{
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: '0.05em',
            color: '#F0F4FF',
            marginBottom: 6,
            textShadow: '0 0 40px rgba(0,200,255,0.25)',
          }}
        >
          {firstName.toUpperCase()}
        </h1>
        <p
          className="font-exo2"
          style={{ fontSize: 14, color: '#7A8AAD', marginBottom: 28 }}
        >
          {activeProfile?.fitness_goal === 'strength' && 'Building raw power & muscle mass'}
          {activeProfile?.fitness_goal === 'aesthetic' && 'Shaping & defining your physique'}
          {activeProfile?.fitness_goal === 'fat_loss' && 'Burning fat & staying lean'}
          {!activeProfile?.fitness_goal && 'Your personal fitness OS'}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={() => onNavigate('workout')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Dumbbell size={16} />
            Start Workout
          </button>
          <button
            className="btn-secondary"
            onClick={() => onNavigate('nutrition')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Apple size={16} />
            Log Meal
          </button>
        </div>
      </div>

      {/* Right: Body Metrics Card */}
      <div
        className="glass-card"
        style={{
          padding: '24px 28px',
          minWidth: 280,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.borderColor = 'rgba(0,200,255,0.2)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,200,255,0.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(0,200,255,0.15)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle, ${bmiColor}22, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p className="font-exo2" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7A8AAD' }}>
            Body Metrics
          </p>
          {error && (
            <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8AAD' }}>
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonBlock width="60%" height={36} />
            <SkeletonBlock width="100%" height={16} />
            <SkeletonBlock width="80%" height={16} />
          </div>
        ) : error ? (
          <p className="font-exo2" style={{ color: '#FF6688', fontSize: 13 }}>{error}</p>
        ) : (
          <>
            {/* BMI Hero */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span
                className="font-orbitron"
                style={{ fontSize: 40, fontWeight: 900, color: bmiColor, lineHeight: 1 }}
              >
                {bmi?.bmi ?? '—'}
              </span>
              <span style={{ fontSize: 12, color: bmiColor, fontWeight: 700, letterSpacing: '0.05em' }}>
                BMI
              </span>
            </div>
            <span style={{
              display: 'inline-block',
              background: `${bmiColor}22`,
              border: `1px solid ${bmiColor}44`,
              borderRadius: 99,
              padding: '2px 10px',
              fontSize: 11,
              color: bmiColor,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}>
              {bmi?.category ?? '—'}
            </span>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Weight', value: profile?.weight_kg ? `${profile.weight_kg} kg` : '—', Icon: Scale },
                { label: 'Height', value: profile?.height_cm ? `${profile.height_cm} cm` : '—', Icon: TrendingUp },
                { label: 'TDEE', value: diet?.tdee ? `${diet.tdee} kcal` : '—', Icon: Zap },
                { label: 'Ideal Wt', value: bmi?.ideal_weight_kg ? `${bmi.ideal_weight_kg} kg` : '—', Icon: TrendingUp },
              ].map(({ label, value, Icon }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <p className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {label}
                  </p>
                  <p className="font-orbitron" style={{ fontSize: 15, fontWeight: 700, color: '#F0F4FF' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
