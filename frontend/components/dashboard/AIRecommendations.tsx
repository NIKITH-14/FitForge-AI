'use client';
import { useState, useEffect } from 'react';
import { Sparkles, ServerCrash, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

export default function AIRecommendations() {
  const { activeProfile } = useAuth();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadRecommendation = async () => {
    try {
      const res = await api.get('/ai/recommendations');
      const recs = res.data.recommendations || [];
      if (recs.length > 0) {
        setRecommendation(recs[0]);
        localStorage.setItem(`aiRecCache_${activeProfile?.id}`, JSON.stringify(recs[0]));
        setIsOffline(false);
      } else {
        setRecommendation(null);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        const cached = localStorage.getItem(`aiRecCache_${activeProfile?.id}`);
        if (cached) {
          setRecommendation(JSON.parse(cached));
          setIsOffline(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfile) {
      loadRecommendation();
    }
  }, [activeProfile]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // POST /ai/analyze generates new recommendation
      const res = await api.post('/ai/analyze', {});
      const newRecs = res.data.recommendations;
      if (newRecs && newRecs.length > 0) {
        setRecommendation(newRecs[0]);
        localStorage.setItem(`aiRecCache_${activeProfile?.id}`, JSON.stringify(newRecs[0]));
        setIsOffline(false);
        toast.success('New insights generated');
      }
    } catch (err) {
      toast.error('Failed to generate insights. You may be offline.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 h-full min-h-[220px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-[var(--accent-cyan)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-full relative" style={{ background: 'linear-gradient(135deg, rgba(123,47,247,0.08), rgba(0,200,255,0.05))' }}>
      
      {isOffline && recommendation && (
        <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-yellow-500/20 flex items-center gap-1 z-10">
          <ServerCrash className="w-3 h-3" /> Offline
        </div>
      )}

      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div className="flex items-center gap-2 text-[var(--accent-cyan)]">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-orbitron font-bold text-sm tracking-wider uppercase">AI Insights</h3>
        </div>
        
        <button 
          onClick={handleGenerate} 
          disabled={generating}
          className="bg-white/5 hover:bg-white/10 text-[var(--accent-cyan)] text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-2 border border-[var(--accent-cyan)]/30 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Analyzing...' : 'Generate New'}
        </button>
      </div>

      {recommendation ? (
        <div className="flex flex-col h-[calc(100%-3rem)]">
          <div className="mb-4">
            <span className="inline-block px-2 py-1 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] text-[10px] font-bold uppercase tracking-wider rounded border border-[var(--accent-purple)]/30 mb-3">
              {recommendation.category || 'General'}
            </span>
            <p className="text-white text-base md:text-lg leading-relaxed font-light">
              "{recommendation.recommendation_text || recommendation.text}"
            </p>
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-[var(--text-muted)] text-xs">
              Generated {new Date(recommendation.created_at || Date.now()).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full opacity-60 mt-4">
          <Sparkles className="w-8 h-8 text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-muted)] text-sm text-center">
            Log a workout to receive personalized AI insights and recovery recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
