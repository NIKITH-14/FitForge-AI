'use client';
import { useState, useRef, useCallback, DragEvent } from 'react';
import {
  UtensilsCrossed, Search, Loader2, ChevronRight,
  CheckCircle2, XCircle, Heart, ExternalLink,
  FileSpreadsheet, Sparkles, X, Upload,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'manual' | 'excel';

interface Recipe {
  id: number;
  title: string;
  image: string | null;
  sourceUrl: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  usedIngredients: string[];
  missedIngredients: string[];
  likes: number;
}

interface ApiResponse {
  success: boolean;
  data?: Recipe[];        // manual search
  recipes?: Recipe[];     // Excel upload
  message: string;
  ingredients?: string[]; // Excel upload: extracted list
  meta?: { ingredientsUsed: string[]; goal: string; count: number };
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabBtn({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
        fontWeight: 700, fontSize: 13, transition: 'all 0.2s ease',
        background: active ? 'linear-gradient(135deg, #7B2FF7, #00C8FF)' : 'transparent',
        color: active ? '#fff' : '#7A8AAD',
        boxShadow: active ? '0 0 16px rgba(123,47,247,0.3)' : 'none',
      }}
    >
      {icon}{label}
    </button>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        transition: 'all 0.25s ease', cursor: 'pointer', textDecoration: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,255,0.3)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,200,255,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {recipe.image && !imgError
          ? <img src={recipe.image} alt={recipe.title} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UtensilsCrossed size={28} style={{ opacity: 0.2, color: '#7A8AAD' }} /></div>
        }
        {recipe.likes > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Heart size={10} style={{ color: '#FF6688' }} fill="#FF6688" />
            <span className="font-exo2" style={{ fontSize: 10, color: '#F0F4FF', fontWeight: 600 }}>{recipe.likes}</span>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="font-exo2" style={{ fontSize: 13, fontWeight: 700, color: '#F0F4FF', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {recipe.title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recipe.usedIngredients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <CheckCircle2 size={13} style={{ color: '#00C8FF', marginTop: 1, flexShrink: 0 }} />
              <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', lineHeight: 1.5 }}>
                <span style={{ color: '#00C8FF', fontWeight: 600 }}>Used: </span>
                {recipe.usedIngredients.slice(0, 4).join(', ')}
                {recipe.usedIngredients.length > 4 && ` +${recipe.usedIngredients.length - 4}`}
              </p>
            </div>
          )}
          {recipe.missedIngredients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <XCircle size={13} style={{ color: '#FF6688', marginTop: 1, flexShrink: 0 }} />
              <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', lineHeight: 1.5 }}>
                <span style={{ color: '#FF6688', fontWeight: 600 }}>Missing: </span>
                {recipe.missedIngredients.slice(0, 3).join(', ')}
                {recipe.missedIngredients.length > 3 && ` +${recipe.missedIngredients.length - 3}`}
              </p>
            </div>
          )}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.2)' }}>
              <span className="font-exo2" style={{ fontSize: 10, color: '#00C8FF', fontWeight: 700 }}>{recipe.usedIngredientCount} used</span>
            </span>
            {recipe.missedIngredientCount > 0 && (
              <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(255,102,136,0.08)', border: '1px solid rgba(255,102,136,0.2)' }}>
                <span className="font-exo2" style={{ fontSize: 10, color: '#FF6688', fontWeight: 700 }}>{recipe.missedIngredientCount} missing</span>
              </span>
            )}
          </div>
          <ExternalLink size={12} style={{ color: '#7A8AAD', flexShrink: 0 }} />
        </div>
      </div>
    </a>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function RecipeSkeleton() {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="shimmer" style={{ width: '100%', aspectRatio: '16/9' }} />
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="shimmer" style={{ height: 16, borderRadius: 6, width: '80%' }} />
        <div className="shimmer" style={{ height: 12, borderRadius: 6, width: '60%' }} />
        <div className="shimmer" style={{ height: 12, borderRadius: 6, width: '50%' }} />
      </div>
    </div>
  );
}

// ─── Ingredient Pills ─────────────────────────────────────────────────────────

function IngredientPills({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(ing => (
          <span key={ing} style={{ padding: '4px 10px', borderRadius: 20, background: `${color}14`, border: `1px solid ${color}30` }}>
            <span className="font-exo2" style={{ fontSize: 11, color, fontWeight: 600 }}>{ing}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecipeRecommendations() {
  const { activeProfile } = useAuth();

  const [tab, setTab]                     = useState<TabMode>('manual');
  const [recipes, setRecipes]             = useState<Recipe[]>([]);
  const [message, setMessage]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [hasSearched, setHasSearched]     = useState(false);

  // ── Manual tab ───────────────────────────────────────────────────────────────
  const [ingredients, setIngredients]     = useState('');
  const inputRef                          = useRef<HTMLInputElement>(null);

  // ── Excel tab ────────────────────────────────────────────────────────────────
  const [excelFile, setExcelFile]         = useState<File | null>(null);
  const [extractedIngredients, setExtractedIngredients] = useState<string[]>([]);
  const [isDragging, setIsDragging]       = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const resetResults = () => { setRecipes([]); setMessage(''); setHasSearched(false); setExtractedIngredients([]); };
  const handleTabChange = (t: TabMode) => { setTab(t); resetResults(); };

  // ─────────────────────────────────────────────────────────────────────────────
  // Manual search
  // ─────────────────────────────────────────────────────────────────────────────
  const handleManualSearch = useCallback(async () => {
    const trimmed = ingredients.trim();
    if (!trimmed) { toast.error('Please enter at least one ingredient.'); inputRef.current?.focus(); return; }

    setLoading(true); setHasSearched(true); setRecipes([]); setMessage('');
    try {
      const goal = activeProfile?.fitness_goal || 'maintain';
      const res  = await api.get<ApiResponse>('/recipes', { params: { ingredients: trimmed, goal, limit: 10 } });
      setRecipes(res.data.data || []);
      setMessage(res.data.message || '');
      if (!res.data.data?.length) toast('No recipes found. Try different ingredients.', { icon: '🍽️' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to fetch recipes. Please try again.';
      setMessage(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [ingredients, activeProfile]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Excel file helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const applyFile = (file: File) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext     = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowed.includes(ext)) { toast.error('Please upload an .xlsx, .xls, or .csv file.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB.'); return; }
    setExcelFile(file); resetResults();
  };

  const handleFileChange  = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) applyFile(f); };
  const handleDrop        = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) applyFile(f); };
  const clearFile         = () => { setExcelFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; resetResults(); };

  // ─────────────────────────────────────────────────────────────────────────────
  // Excel upload + search
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExcelSearch = useCallback(async () => {
    if (!excelFile) { toast.error('Please select a spreadsheet file first.'); return; }

    setLoading(true); setHasSearched(true); setRecipes([]); setMessage(''); setExtractedIngredients([]);
    try {
      const goal     = activeProfile?.fitness_goal || 'maintain';
      const formData = new FormData();
      formData.append('file', excelFile);

      const res = await api.post<ApiResponse>(`/recipes/from-excel?goal=${goal}&limit=10`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const extracted = res.data.ingredients || [];
      const recipeList = res.data.recipes || [];
      setExtractedIngredients(extracted);
      setRecipes(recipeList);
      setMessage(res.data.message || '');
      if (recipeList.length) toast.success(`Extracted ${extracted.length} ingredients from your file!`);
      else toast('No recipes found for extracted ingredients.', { icon: '🍽️' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to process file. Please try again.';
      setMessage(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [excelFile, activeProfile]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="glass-card"
      style={{ padding: '28px 24px', transition: 'all 0.3s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(123,47,247,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Powered by Spoonacular</p>
          <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UtensilsCrossed size={16} style={{ color: '#7B2FF7' }} />Recipe Finder
          </h2>
        </div>
        {activeProfile?.fitness_goal && (
          <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(123,47,247,0.12)', border: '1px solid rgba(123,47,247,0.25)' }}>
            <span className="font-exo2" style={{ fontSize: 10, color: '#A678FF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {activeProfile.fitness_goal.replace(/_/g, ' ')}
            </span>
          </span>
        )}
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 20 }}>
        <TabBtn label="By Ingredients" icon={<Search size={13} />}          active={tab === 'manual'} onClick={() => handleTabChange('manual')} />
        <TabBtn label="Upload Spreadsheet" icon={<FileSpreadsheet size={13} />} active={tab === 'excel'}  onClick={() => handleTabChange('excel')} />
      </div>

      {/* ── Manual Tab ──────────────────────────────────────────────────────── */}
      {tab === 'manual' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0 14px', transition: 'border-color 0.2s' }}
              onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,255,0.4)'}
              onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <Search size={15} style={{ color: '#7A8AAD', flexShrink: 0 }} />
              <input
                ref={inputRef} type="text" value={ingredients}
                onChange={e => setIngredients(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                placeholder="e.g. egg, tomato, chicken, spinach"
                className="font-exo2"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F0F4FF', fontSize: 14, padding: '13px 0', caretColor: '#00C8FF' }}
              />
            </div>
            <button onClick={handleManualSearch} disabled={loading} className="font-exo2"
              style={{ padding: '0 20px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(123,47,247,0.3)' : 'linear-gradient(135deg, #7B2FF7, #00C8FF)',
                color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap', boxShadow: loading ? 'none' : '0 0 20px rgba(123,47,247,0.3)', transition: 'all 0.2s ease',
              }}
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Searching…</> : <><Search size={15} /> Search Recipes</>}
            </button>
          </div>
          {!hasSearched && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderRadius: 12, background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.1)', marginBottom: 8 }}>
              <ChevronRight size={14} style={{ color: '#00C8FF', flexShrink: 0 }} />
              <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', lineHeight: 1.6 }}>
                Enter ingredients separated by commas, then press <span style={{ color: '#F0F4FF', fontWeight: 600 }}>Search Recipes</span>. Recipes are tailored to your fitness goal.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Excel Tab ───────────────────────────────────────────────────────── */}
      {tab === 'excel' && (
        <>
          {!excelFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="excel-drop-zone"
              style={{
                border: `2px dashed ${isDragging ? 'rgba(0,200,255,0.6)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 14, padding: '36px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: 20,
                background: isDragging ? 'rgba(0,200,255,0.04)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={22} style={{ color: '#00C896' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="font-exo2" style={{ fontSize: 14, fontWeight: 700, color: '#F0F4FF', marginBottom: 4 }}>Drop your grocery spreadsheet here</p>
                <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD' }}>or click to browse — .xlsx, .xls, .csv up to 10 MB</p>
                <p className="font-exo2" style={{ fontSize: 11, color: '#564A6A', marginTop: 6 }}>Spreadsheet must have an <strong style={{ color: '#A678FF' }}>Item</strong> column</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" data-testid="excel-file-input" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileSpreadsheet size={22} style={{ color: '#00C896' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-exo2" style={{ fontSize: 13, fontWeight: 700, color: '#F0F4FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{excelFile.name}</p>
                <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD' }}>{(excelFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={handleExcelSearch} disabled={loading} className="font-exo2"
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? 'rgba(123,47,247,0.3)' : 'linear-gradient(135deg, #7B2FF7, #A678FF)',
                    color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7,
                    opacity: loading ? 0.7 : 1, boxShadow: loading ? 'none' : '0 0 16px rgba(123,47,247,0.3)', transition: 'all 0.2s',
                  }}
                >
                  {loading ? <><Loader2 size={13} className="animate-spin" />Extracting…</> : <><Sparkles size={13} />Extract &amp; Find Recipes</>}
                </button>
                <button onClick={clearFile} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,68,102,0.12)', border: '1px solid rgba(255,68,102,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} color="#FF4466" />
                </button>
              </div>
            </div>
          )}

          {!hasSearched && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderRadius: 12, background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.12)', marginBottom: 8 }}>
              <Upload size={14} style={{ color: '#00C896', flexShrink: 0 }} />
              <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', lineHeight: 1.6 }}>
                Upload a grocery spreadsheet (.xlsx / .csv) with an <span style={{ color: '#F0F4FF', fontWeight: 600 }}>Item</span> column. We'll extract the ingredients and suggest recipes automatically.
              </p>
            </div>
          )}
        </>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <RecipeSkeleton key={i} />)}
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <>
          {tab === 'excel' && extractedIngredients.length > 0 && (
            <IngredientPills label="Ingredients extracted from spreadsheet" items={extractedIngredients} color="#A678FF" />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD' }}>{message}</p>
            {recipes.length > 0 && (
              <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.15)' }}>
                <span className="font-orbitron" style={{ fontSize: 11, color: '#00C8FF', fontWeight: 700 }}>{recipes.length} found</span>
              </span>
            )}
          </div>
          {recipes.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', opacity: 0.6 }}>
              <UtensilsCrossed size={36} style={{ color: '#7A8AAD' }} />
              <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', textAlign: 'center', maxWidth: 320 }}>
                No recipes found for those ingredients. Try adding more common items like "chicken", "rice", or "garlic".
              </p>
            </div>
          )}
          {recipes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {recipes.map(r => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
