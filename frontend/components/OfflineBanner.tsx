'use client';
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial state check
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest text-center py-2 px-4 shadow-[0_4px_20px_rgba(234,179,8,0.3)] animate-fade-in-sub"
      style={{ fontFamily: 'var(--font-exo2)' }}
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff size={14} />
        <span>Offline — AI features unavailable. Showing last saved data.</span>
      </div>
    </div>
  );
}
