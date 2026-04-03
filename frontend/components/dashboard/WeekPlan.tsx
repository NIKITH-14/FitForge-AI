'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw } from 'lucide-react';

interface Exercise {
  exercise: string;
  sets: number;
  reps: string | number;
  muscle_group?: string;
}

interface WorkoutPlan {
  plan_json: {
    schedule: Record<string, Exercise[]>;
    style?: string;
  };
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MUSCLE_EMOJIS: Record<string, string> = {
  chest: '🏋️', back: '🔙', legs: '🦵', shoulders: '💪',
  arms: '💪', core: '⚡', cardio: '🏃', rest: '😴',
  full: '🔥', upper: '💪', lower: '🦵', push: '🏋️', pull: '🔙',
};

function getMuscleEmoji(schedule: Record<string, Exercise[]>, key: string): string {
  const exercises = schedule[key] ?? [];
  if (!exercises.length) return '😴';
  const names = exercises.map(e => (e.exercise || '').toLowerCase()).join(' ');
  for (const [k, v] of Object.entries(MUSCLE_EMOJIS)) {
    if (names.includes(k) || key.toLowerCase().includes(k)) return v;
  }
  return '🔥';
}

function getWorkoutName(key: string, exercises: Exercise[]): string {
  if (!exercises.length) return 'Rest Day';
  const lower = key.toLowerCase();
  if (lower.includes('push')) return 'Push Day';
  if (lower.includes('pull')) return 'Pull Day';
  if (lower.includes('leg')) return 'Leg Day';
  if (lower.includes('upper')) return 'Upper Body';
  if (lower.includes('lower')) return 'Lower Body';
  if (lower.includes('full')) return 'Full Body';
  if (lower.includes('chest')) return 'Chest & Triceps';
  if (lower.includes('back')) return 'Back & Biceps';
  if (lower.includes('cardio')) return 'Cardio Day';
  return exercises[0]?.exercise ? `${exercises[0].exercise}+` : 'Training';
}

export default function WeekPlan() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayIdx = new Date().getDay();
  const todayName = DAY_FULL[todayIdx];

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/workout/plan');
      setPlan(res.data);
    } catch {
      setError('Could not load week plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build 7-day array from schedule
  const schedule = plan?.plan_json?.schedule ?? {};
  const scheduleKeys = Object.keys(schedule);
  const weekDays = DAY_FULL.map((day, i) => {
    const key = scheduleKeys.find(k => k.toLowerCase().includes(day.toLowerCase().slice(0, 3)))
      ?? scheduleKeys[i % scheduleKeys.length];
    return { day, short: DAYS_SHORT[i], key, isToday: i === todayIdx };
  });

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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p className="font-exo2" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7A8AAD', marginBottom: 4 }}>
            Weekly Schedule
          </p>
          <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.05em' }}>
            This Week's Plan
          </h2>
        </div>
        {error && (
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8AAD' }}>
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ width: 110, height: 110, borderRadius: 12, flexShrink: 0 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p className="font-exo2" style={{ color: '#FF6688', marginBottom: 12 }}>{error}</p>
          <button className="btn-secondary" onClick={load} style={{ fontSize: 13, padding: '8px 20px' }}>Retry</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {weekDays.map(({ day, short, key, isToday }) => {
            const exercises = schedule[key] ?? [];
            const isRest = exercises.length === 0;
            const emoji = getMuscleEmoji(schedule, key ?? '');
            const workoutName = getWorkoutName(key ?? '', exercises);

            return (
              <div
                key={day}
                style={{
                  flexShrink: 0,
                  width: 120,
                  padding: '14px 12px',
                  borderRadius: 12,
                  border: `2px solid ${isToday ? '#00C8FF' : 'rgba(255,255,255,0.06)'}`,
                  background: isToday
                    ? 'rgba(0,200,255,0.07)'
                    : isRest ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                  boxShadow: isToday ? '0 0 20px rgba(0,200,255,0.12)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Today indicator */}
                {isToday && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#00C8FF',
                    boxShadow: '0 0 6px rgba(0,200,255,0.8)',
                  }} />
                )}

                <p className="font-exo2" style={{
                  fontSize: 11, fontWeight: 700,
                  color: isToday ? '#00C8FF' : '#7A8AAD',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                }}>
                  {short}
                </p>

                <div style={{ fontSize: 28 }}>{emoji}</div>

                <div>
                  <p className="font-exo2" style={{
                    fontSize: 12, fontWeight: 700,
                    color: isRest ? '#7A8AAD' : '#F0F4FF',
                    lineHeight: 1.3, marginBottom: 4,
                  }}>
                    {workoutName}
                  </p>
                  {!isRest && (
                    <p className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD' }}>
                      {exercises.length} exercises
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
