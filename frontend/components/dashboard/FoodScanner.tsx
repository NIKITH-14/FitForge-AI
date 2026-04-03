'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Check, AlertCircle, X, ServerCrash } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

interface ScanResult {
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_fat_g: number;
  total_carbs_g: number;
}

export default function FoodScanner() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cached result on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('lastFoodScan');
      if (cached) {
        setScanResult(JSON.parse(cached));
        setIsOffline(true); // Treat cached load as "offline/historical" until new scan
      }
    } catch { }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setIsScanning(true);
    setScanResult(null);
    setError(null);
    setIsOffline(false);

    const formData = new FormData();
    formData.append('food_image', file);
    formData.append('meal_type', 'snack');

    try {
      const res = await api.post('/nutrition/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const result = res.data.ai_analysis;
      setScanResult(result);
      localStorage.setItem('lastFoodScan', JSON.stringify(result));
    } catch (err: any) {
      console.error(err);
      setError('Failed to analyze meal. Please try again or check connection.');
      // Try to load cached on error
      const cached = localStorage.getItem('lastFoodScan');
      if (cached) {
        setScanResult(JSON.parse(cached));
        setIsOffline(true);
      }
    } finally {
      setIsScanning(false);
      // Clean up input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!scanResult) return;
    try {
      const toastId = toast.loading('Logging meal...');
      await api.post('/nutrition/log', {
        meal_type: 'snack',
        items: scanResult.items,
      });
      toast.success('Meal logged successfully!', { id: toastId });
      // Reset view after logging
      setImagePreview(null);
      setScanResult(null);
      setIsOffline(false);
      localStorage.removeItem('lastFoodScan'); // Clear cache once logged
    } catch (err) {
      toast.error('Failed to log meal');
    }
  };

  const handleCancel = () => {
    setImagePreview(null);
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="glass-card relative overflow-hidden group transition-all duration-300 h-full flex flex-col justify-center"
      style={{
        border: '2px dashed rgba(0,200,255,0.25)',
        minHeight: '200px'
      }}
      onMouseEnter={(e) => e.currentTarget.style.border = '2px dashed rgba(0,200,255,0.5)'}
      onMouseLeave={(e) => e.currentTarget.style.border = '2px dashed rgba(0,200,255,0.25)'}
    >
      
      {/* Offline Badge */}
      {isOffline && scanResult && !isScanning && (
        <div className="absolute top-2 right-2 bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-yellow-500/20 flex items-center gap-1 z-20">
          <ServerCrash className="w-3 h-3" />
          Offline — showing last saved data
        </div>
      )}

      {/* State 1: Default / Upload */}
      {!imagePreview && !scanResult && (
        <div 
          className="flex flex-col items-center justify-center p-8 cursor-pointer h-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--accent-cyan)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--accent-cyan)]/20 transition-all shadow-[0_0_20px_rgba(0,200,255,0.1)] group-hover:shadow-[0_0_30px_rgba(0,200,255,0.3)]">
            <Camera className="w-8 h-8 text-[var(--accent-cyan)] animate-pulse" />
          </div>
          <h3 className="font-orbitron font-bold text-xl tracking-wide mb-2 text-white">SNAP YOUR MEAL</h3>
          <p className="text-[var(--text-muted)] text-sm text-center max-w-[200px]">
            Gemini will identify your food and estimate macros instantly.
          </p>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* State 2: Scanning Overlay */}
      {imagePreview && isScanning && (
        <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-[200px] h-32 rounded-lg overflow-hidden border border-[var(--accent-cyan)]/30 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="scanning" className="w-full h-full object-cover opacity-50" />
            <div className="absolute left-0 right-0 h-1 bg-[var(--accent-cyan)] shadow-[0_0_10px_#00c8ff] animate-scan" style={{
              animation: 'scanLine 2s linear infinite'
            }} />
          </div>
          <p className="font-orbitron text-[var(--accent-cyan)] animate-pulse">AI is analyzing your meal...</p>
        </div>
      )}

      {/* State 2.5: Error State */}
      {error && !scanResult && !isScanning && (
        <div className="absolute inset-0 z-10 bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-sm py-2 px-4 min-h-[44px]">
              Try Again
            </button>
            <button onClick={handleCancel} className="bg-transparent border border-white/20 text-white text-sm py-2 px-4 rounded-md min-h-[44px]">
              Cancel
            </button>
          </div>
          <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      )}

      {/* State 3: Result View */}
      {scanResult && !isScanning && (
        <div className="flex flex-col h-full p-4 relative z-0">
          <button onClick={handleCancel} className="absolute top-2 right-2 p-3 text-[var(--text-muted)] hover:text-white bg-black/20 rounded-full w-11 h-11 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
          
          <h4 className="font-orbitron font-semibold text-[var(--accent-cyan)] mb-3 text-sm">DETECTED ITEMS</h4>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
            {scanResult.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm bg-white/5 p-2 rounded-md">
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-orbitron font-bold text-[#FFB020]">{item.calories} kcal</p>
                  <p className="text-xs text-white/70">P:{item.protein_g} C:{item.carbs_g} F:{item.fat_g}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3 flex justify-between items-center mb-4">
            <div className="font-orbitron text-sm">
              <span className="text-[var(--text-muted)]">TOTAL: </span>
              <span className="text-[var(--accent-cyan)] font-bold">{scanResult.total_calories} kcal</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-blue-400">P:{scanResult.total_protein_g}</span>
              <span className="text-green-400">C:{scanResult.total_carbs_g}</span>
              <span className="text-yellow-400">F:{scanResult.total_fat_g}</span>
            </div>
          </div>

          <button 
            onClick={handleConfirm}
            className="w-full bg-[var(--accent-cyan)] text-black font-semibold py-2 rounded-md flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-colors min-h-[44px]"
          >
            <Check className="w-4 h-4" /> Confirm & Log Fast
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}} />
    </div>
  );
}
