'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { RefreshCw, UtensilsCrossed } from 'lucide-react';

interface DietData {
  daily_calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
}

interface FoodItem {
  name: string;
  calories?: number;
  protein?: number;
}

interface FoodLogEntry {
  id: string;
  meal_type: string;
  items_json?: string | FoodItem[];
  total_calories?: number;
  total_protein?: number;
  total_fat?: number;
  total_carbs?: number;
  logged_at?: string;
}

interface FoodLog {
  totals?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  entries?: FoodLogEntry[];
}

const MACRO_CONFIG = [
  { key: 'protein', label: 'Protein', unit: 'g', color: '#00C8FF', targetKey: 'protein_g' as keyof DietData, logKey: 'protein' as keyof NonNullable<FoodLog['totals']> },
  { key: 'carbs',   label: 'Carbs',   unit: 'g', color: '#FFD700', targetKey: 'carbs_g'   as keyof DietData, logKey: 'carbs'   as keyof NonNullable<FoodLog['totals']> },
  { key: 'fat',     label: 'Fat',     unit: 'g', color: '#FF6432', targetKey: 'fat_g'     as keyof DietData, logKey: 'fat'     as keyof NonNullable<FoodLog['totals']> },
];

const MEAL_TYPE_COLOR: Record<string, string> = {
  breakfast: '#FFD700', lunch: '#00C8FF', dinner: '#7B2FF7', snack: '#FF6432',
};

function parseItems(items: string | FoodItem[] | undefined): FoodItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  try { return JSON.parse(items); } catch { return []; }
}

// ── SVG Calorie Ring ──────────────────────────────────────────────
function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const remaining = Math.max(0, target - consumed);
  const pct = target > 0 ? remaining / target : 0;
  const dash = pct * circ;
  const over = consumed > target;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={80} cy={80} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={14} />
        {/* Fill */}
        <circle cx={80} cy={80} r={r} fill="none"
          stroke={over ? '#FF6688' : '#00C8FF'}
          strokeWidth={14}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${over ? '#FF6688' : '#00C8FF'})` }}
        />
        {/* Secondary arc for glow effect */}
        <circle cx={80} cy={80} r={r} fill="none"
          stroke={over ? 'rgba(255,102,136,0.15)' : 'rgba(0,200,255,0.08)'}
          strokeWidth={20}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      {/* Center text (counter-rotated) */}
      <div style={{
        position: 'absolute',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <span className="font-orbitron" style={{ fontSize: 26, fontWeight: 900, color: over ? '#FF6688' : '#F0F4FF', lineHeight: 1 }}>
          {remaining.toFixed(0)}
        </span>
        <span className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
          {over ? 'over' : 'kcal left'}
        </span>
      </div>
    </div>
  );
}

export default function NutritionPanel() {
  const [diet, setDiet] = useState<DietData | null>(null);
  const [foodLog, setFoodLog] = useState<FoodLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Use swedish locale which outputs YYYY-MM-DD in local time
      const todayLocal = new Date().toLocaleDateString('sv-SE');
      const [dietRes, logRes] = await Promise.allSettled([
        api.get('/diet/plan'),
        api.get(`/nutrition/log?date=${todayLocal}`),
      ]);
      if (dietRes.status === 'fulfilled') setDiet(dietRes.value.data);
      if (logRes.status === 'fulfilled') setFoodLog(logRes.value.data);
      if (dietRes.status === 'rejected' && logRes.status === 'rejected') throw new Error('Both failed');
    } catch {
      setError('Could not load nutrition data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  let consumed = foodLog?.totals?.calories ?? 0;
  if (Number.isNaN(consumed)) consumed = 0;
  let target = diet?.daily_calories ?? 0;
  if (Number.isNaN(target)) target = 0;

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
            Daily Intake
          </p>
          <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.05em' }}>
            Nutrition
          </h2>
        </div>
        {error && (
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8AAD' }}>
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 40, borderRadius: 8 }} />)}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p className="font-exo2" style={{ color: '#FF6688', marginBottom: 12 }}>{error}</p>
          <button className="btn-secondary" onClick={load} style={{ fontSize: 13, padding: '8px 20px' }}>Retry</button>
        </div>
      ) : (
        <>
          {/* Calorie ring + macro bars side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'center', marginBottom: 24 }}>
            {/* Ring */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalorieRing consumed={consumed} target={target} />
            </div>

            {/* Macro bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!diet ? (
                <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD' }}>No diet plan generated yet</p>
              ) : (
                MACRO_CONFIG.map(macro => {
                  let tgt = (diet[macro.targetKey] as number) ?? 0;
                  if (Number.isNaN(tgt)) tgt = 0;
                  let cons = (foodLog?.totals?.[macro.logKey] as number) ?? 0;
                  if (Number.isNaN(cons)) cons = 0;
                  const pct = tgt > 0 ? Math.min(100, (cons / tgt) * 100) : 0;
                  return (
                    <div key={macro.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', fontWeight: 600 }}>{macro.label}</span>
                        <span className="font-orbitron" style={{ fontSize: 12, color: '#F0F4FF' }}>
                          {cons.toFixed(0)}<span style={{ color: '#7A8AAD' }}>/{tgt}{macro.unit}</span>
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 99,
                          background: `linear-gradient(90deg, ${macro.color}99, ${macro.color})`,
                          boxShadow: `0 0 8px ${macro.color}44`,
                          transition: 'width 1s ease',
                        }} />
                      </div>
                    </div>
                  );
                })
              )}
              {/* Calorie summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD' }}>Consumed</span>
                <span className="font-orbitron" style={{ fontSize: 13, color: '#00C8FF', fontWeight: 700 }}>
                  {consumed.toFixed(0)} / {target} kcal
                </span>
              </div>
            </div>
          </div>

          {/* Meal log */}
          <div>
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
              Today's Meals
            </p>
            {!foodLog?.entries?.length ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#7A8AAD' }}>
                <UtensilsCrossed size={18} style={{ opacity: 0.4 }} />
                <p className="font-exo2" style={{ fontSize: 13 }}>No meals logged today. Snap a photo or add manually.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {foodLog.entries.slice(0, 5).map((entry) => {
                  const items = parseItems(entry.items_json);
                  const mealColor = MEAL_TYPE_COLOR[entry.meal_type] ?? '#7A8AAD';
                  return (
                    <div key={entry.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 6, height: 32, borderRadius: 99,
                          background: `linear-gradient(180deg, ${mealColor}, ${mealColor}66)`,
                          flexShrink: 0,
                        }} />
                        <div>
                          <p className="font-exo2" style={{ fontSize: 12, fontWeight: 700, color: mealColor, textTransform: 'capitalize', letterSpacing: '0.05em' }}>
                            {entry.meal_type}
                          </p>
                          <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginTop: 2 }}>
                            {items.length > 0 ? items.slice(0, 2).map(i => i.name).join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '') : 'Meal logged'}
                          </p>
                        </div>
                      </div>
                      <span className="font-orbitron" style={{ fontSize: 13, fontWeight: 700, color: '#F0F4FF', flexShrink: 0 }}>
                        {entry.total_calories?.toFixed(0) ?? '—'} <span style={{ fontSize: 10, color: '#7A8AAD', fontFamily: 'var(--font-exo2)' }}>kcal</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
