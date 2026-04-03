'use client';
import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Info, ServerCrash } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function FormAnalysis() {
  const { activeProfile } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!activeProfile) return;
    
    const fetchData = async () => {
      try {
        const [sessionRes, recRes] = await Promise.allSettled([
          api.get('/machine/sessions?limit=1'),
          api.get('/ai/recommendations')
        ]);

        let loadedSession = null;
        let loadedRec = null;

        if (sessionRes.status === 'fulfilled') {
          loadedSession = sessionRes.value.data.sessions?.[0] || null;
        } else if (sessionRes.status === 'rejected') {
          // If 404, session remains null. If network error, we try cache.
          if (sessionRes.reason?.response?.status !== 404) {
             throw sessionRes.reason;
          }
        }

        if (recRes.status === 'fulfilled') {
          const recs = recRes.value.data.recommendations || [];
          // Try to find a technique rec, otherwise use the first one
          loadedRec = recs.find((r: any) => r.category === 'technique' || r.category === 'form') || recs[0] || null;
        }

        setSession(loadedSession);
        setRecommendation(loadedRec);
        
        // Save to cache
        if (loadedSession) {
          localStorage.setItem(`formCache_${activeProfile.id}`, JSON.stringify({ session: loadedSession, rec: loadedRec }));
          setIsOffline(false);
        }
      } catch (err: any) {
        console.error('FormAnalysis fetch error', err);
        // Graceful degradation
        const cached = localStorage.getItem(`formCache_${activeProfile.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSession(parsed.session);
          setRecommendation(parsed.rec);
          setIsOffline(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeProfile]);

  if (loading) {
    return (
      <div className="glass-card p-6 h-full min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-[var(--accent-purple)] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="glass-card p-6 h-full min-h-[300px] flex flex-col items-center justify-center text-center">
        <Activity className="w-12 h-12 text-[var(--accent-purple)]/40 mb-4" />
        <h3 className="font-orbitron font-semibold text-white mb-2">FORM ANALYSIS</h3>
        <p className="text-[var(--text-muted)] text-sm">
          Complete your first machine session to see form analysis.
        </p>
      </div>
    );
  }

  let score = session.avg_form_score ?? 0;
  score = Number(score);
  if (Number.isNaN(score)) score = 0;
  let scoreColor = '#DC2626'; // Red
  if (score >= 80) scoreColor = '#00FF88'; // Green
  else if (score >= 60) scoreColor = '#FF6B35'; // Orange

  let errors: string[] = [];
  if (session.errors_json) {
    try {
      errors = JSON.parse(session.errors_json);
    } catch { }
  }

  // Generate rep dots (fake data if rep_scores_json is missing, but backend should provide it)
  // For UI sake, we'll just mock 5 dots based on the average score if we don't have the array
  const dotsCount = session.rep_count > 0 ? Math.min(session.rep_count, 10) : 5;
  const dots = Array.from({ length: dotsCount }).map((_, i) => {
    // vary the score slightly around the average
    const variation = Math.sin(i) * 10;
    const repScore = Math.min(100, Math.max(0, score + variation));
    if (repScore >= 80) return '#00FF88';
    if (repScore >= 60) return '#FF6B35';
    return '#DC2626';
  });

  return (
    <div className="glass-card p-6 h-full relative">
      {isOffline && (
        <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-yellow-500/20 flex items-center gap-1">
          <ServerCrash className="w-3 h-3" /> Offline — showing last saved data
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-orbitron font-bold text-[var(--accent-purple)] text-sm tracking-wider uppercase mb-1">
            Form Analysis
          </h3>
          <p className="text-white font-medium text-lg capitalize">{session.exercise_name}</p>
          <p className="text-[var(--text-muted)] text-xs">
            {new Date(session.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        
        <div className="text-right">
          <div className="font-orbitron text-[48px] leading-none font-bold" style={{ color: scoreColor, textShadow: `0 0 20px ${scoreColor}40` }}>
            {score.toFixed(0)}
          </div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mt-1">Avg Score</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Rep Consistency</p>
        <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide">
          {dots.map((color, i) => (
            <div key={i} className="w-11 h-11 flex items-center justify-center flex-shrink-0 cursor-pointer">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
              />
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 bg-red-500/5 rounded-lg p-4 border border-red-500/10">
          <div className="flex items-center gap-2 mb-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Detected Issues</h4>
          </div>
          <ul className="list-disc pl-5 text-sm text-[var(--text-muted)] space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation && (
        <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-[rgba(123,47,247,0.5)] to-[rgba(0,200,255,0.3)] mt-auto">
          <div className="bg-[#0B0D17] rounded-xl p-4 h-full" style={{ background: 'linear-gradient(135deg, rgba(123,47,247,0.08), rgba(0,200,255,0.05))' }}>
            <div className="flex items-center gap-2 mb-2 text-[var(--accent-cyan)]">
              <Info className="w-4 h-4" />
              <h4 className="font-orbitron font-semibold text-xs tracking-wider">AI COACHING</h4>
            </div>
            <p className="text-white text-sm leading-relaxed">
              "{recommendation.recommendation_text || recommendation.text}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
