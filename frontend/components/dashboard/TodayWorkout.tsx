'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw, Check, Moon } from 'lucide-react';

interface Exercise {
  exercise: string;
  sets: number;
  reps: string | number;
  rest_seconds?: number;
  muscle_group?: string;
  type?: string;
}

interface WorkoutPlan {
  plan_json: {
    schedule: Record<string, Exercise[]>;
    style?: string;
  };
  days_per_week: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  strength: { bg: 'rgba(255,100,50,0.15)', color: '#FF6432' },
  cardio: { bg: 'rgba(0,200,255,0.12)', color: '#00C8FF' },
  core: { bg: 'rgba(123,47,247,0.15)', color: '#B06CFF' },
  default: { bg: 'rgba(122,138,173,0.1)', color: '#7A8AAD' },
};

function getExerciseType(ex: Exercise): string {
  const name = (ex.exercise || '').toLowerCase();
  if (ex.type) return ex.type.toLowerCase();
  if (['run', 'bike', 'jump', 'cardio', 'sprint', 'plank', 'burpee', 'row'].some(k => name.includes(k))) return 'cardio';
  if (['crunch', 'sit-up', 'plank', 'core', 'ab'].some(k => name.includes(k))) return 'core';
  return 'strength';
}

export default function TodayWorkout() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/workout/plan');
      setPlan(res.data);
    } catch {
      setError('Could not load workout plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleComplete = (idx: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // Figure out today's exercises
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayKey = plan?.plan_json?.schedule
    ? Object.keys(plan.plan_json.schedule).find(k =>
        k.toLowerCase().includes(todayName.toLowerCase().slice(0, 3))
      ) ?? Object.keys(plan.plan_json.schedule)[0]
    : null;
  const exercises: Exercise[] = todayKey ? (plan?.plan_json?.schedule?.[todayKey] ?? []) : [];
  const isRestDay = exercises.length === 0;

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
            Today — {todayName}
          </p>
          <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.05em' }}>
            Today's Workout
          </h2>
        </div>
        {!loading && !error && !isRestDay && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 99, padding: '4px 12px',
          }}>
            <span style={{ fontSize: 11, color: '#00FF88', fontWeight: 700, fontFamily: 'var(--font-exo2)', letterSpacing: '0.1em' }}>
              {completed.size}/{exercises.length} DONE
            </span>
          </div>
        )}
        {error && (
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8AAD' }}>
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="shimmer" style={{ height: 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p className="font-exo2" style={{ color: '#FF6688', marginBottom: 12 }}>{error}</p>
          <button className="btn-secondary" onClick={load} style={{ fontSize: 13, padding: '8px 20px' }}>Retry</button>
        </div>
      ) : isRestDay ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Moon size={40} style={{ color: '#7A8AAD', margin: '0 auto 16px', opacity: 0.5 }} />
          <p className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', marginBottom: 8 }}>Rest Day</p>
          <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD' }}>Recovery is part of the plan. Rest up and come back stronger.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exercises.map((ex, i) => {
            const type = getExerciseType(ex);
            const tag = TAG_COLORS[type] ?? TAG_COLORS.default;
            const done = completed.has(i);
            return (
              <div
                key={i}
                onClick={() => toggleComplete(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: done ? 'rgba(0,255,136,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${done ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!done) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!done) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              >
                {/* Completion dot */}
                <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: `2px solid ${done ? '#00FF88' : 'rgba(255,255,255,0.15)'}`,
                    background: done ? 'rgba(0,255,136,0.2)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {done && <Check size={12} style={{ color: '#00FF88' }} />}
                  </div>
                </div>

                {/* Exercise info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-exo2" style={{
                    fontSize: 14, fontWeight: 700,
                    color: done ? '#7A8AAD' : '#F0F4FF',
                    textDecoration: done ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ex.exercise}
                  </p>
                  <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginTop: 2 }}>
                    {ex.sets} sets × {ex.reps} reps
                    {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ''}
                  </p>
                </div>

                {/* Type tag */}
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-exo2)',
                  padding: '3px 10px', borderRadius: 99,
                  background: tag.bg, color: tag.color,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
