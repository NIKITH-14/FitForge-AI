'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

interface Session {
  id: string;
  exercise_name?: string;
  rep_count?: number;
  resistance_kg?: number;
  avg_form_score?: number | string;
  timestamp?: string;
}

interface ChartPoint {
  name: string;
  formScore: number | null;
  volume: number | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#10101f', border: '1px solid rgba(0,200,255,0.2)',
      borderRadius: 10, padding: '10px 14px',
    }}>
      <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-orbitron" style={{ fontSize: 13, color: p.color }}>
          {p.name}: <strong>{p.value?.toFixed(1) ?? '—'}</strong>
          {p.dataKey === 'formScore' ? '/100' : ' vol'}
        </p>
      ))}
    </div>
  );
};

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/machine/sessions?limit=10');
      setSessions(res.data.sessions || res.data || []);
    } catch {
      setError('Could not load session history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const chartData: ChartPoint[] = sessions
    .slice()
    .reverse()
    .map((s, i) => ({
      name: `S${i + 1}${s.exercise_name ? ' · ' + s.exercise_name.slice(0, 8) : ''}`,
      formScore: s.avg_form_score != null ? parseFloat(String(s.avg_form_score)) : null,
      volume: (s.rep_count ?? 0) * (s.resistance_kg ?? 0),
    }));

  const avgScore = sessions.length
    ? sessions.reduce((a, s) => a + (s.avg_form_score ? parseFloat(String(s.avg_form_score)) : 0), 0) / sessions.length
    : 0;

  const scoreColor = avgScore >= 75 ? '#00FF88' : avgScore >= 50 ? '#FFB347' : '#FF6688';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            Last 10 Sessions
          </p>
          <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.05em' }}>
            Session History
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {sessions.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${scoreColor}12`, border: `1px solid ${scoreColor}33`,
              borderRadius: 99, padding: '4px 12px',
            }}>
              <span className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD' }}>Avg Score</span>
              <span className="font-orbitron" style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>
                {Number.isNaN(avgScore) ? '—' : avgScore.toFixed(0)}/100
              </span>
            </div>
          )}
          {error && (
            <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8AAD' }}>
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="shimmer" style={{ height: 220, borderRadius: 12 }} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p className="font-exo2" style={{ color: '#FF6688', marginBottom: 12 }}>{error}</p>
          <button className="btn-secondary" onClick={load} style={{ fontSize: 13, padding: '8px 20px' }}>Retry</button>
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Activity size={40} style={{ color: '#7A8AAD', margin: '0 auto 16px', opacity: 0.3 }} />
          <p className="font-orbitron" style={{ fontSize: 14, color: '#F0F4FF', marginBottom: 8 }}>No Sessions Yet</p>
          <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD' }}>
            Connect your smart machine and complete a session to see your history here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Form Score Chart */}
          <div>
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
              Form Score Trend
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#7A8AAD', fontSize: 10, fontFamily: 'var(--font-exo2)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#7A8AAD', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="formScore" name="Form Score"
                  stroke="#00C8FF" strokeWidth={2} dot={{ fill: '#00C8FF', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#00C8FF', stroke: 'rgba(0,200,255,0.3)', strokeWidth: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Chart */}
          <div>
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
              Volume (Reps × Resistance)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#7A8AAD', fontSize: 10, fontFamily: 'var(--font-exo2)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7A8AAD', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="volume" name="Volume"
                  stroke="#7B2FF7" strokeWidth={2} dot={{ fill: '#7B2FF7', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#7B2FF7', stroke: 'rgba(123,47,247,0.3)', strokeWidth: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sessions summary row */}
      {!loading && !error && sessions.length > 0 && (
        <div style={{
          display: 'flex', gap: 20, marginTop: 20, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto',
        }}>
          {sessions.slice(0, 5).map(s => (
            <div key={s.id} style={{
              flexShrink: 0, minWidth: 120,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <p className="font-exo2" style={{ fontSize: 11, fontWeight: 700, color: '#F0F4FF', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.exercise_name || 'Session'}
              </p>
              <p className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD' }}>
                {s.rep_count ?? 0} reps · {s.resistance_kg ?? 0}kg
              </p>
              {s.avg_form_score != null && (
                <p className="font-orbitron" style={{
                  fontSize: 12, fontWeight: 700, marginTop: 4,
                  color: parseFloat(String(s.avg_form_score)) >= 75 ? '#00FF88' : parseFloat(String(s.avg_form_score)) >= 50 ? '#FFB347' : '#FF6688',
                }}>
                  {Number.isNaN(parseFloat(String(s.avg_form_score))) ? '—' : parseFloat(String(s.avg_form_score)).toFixed(0)}/100
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
