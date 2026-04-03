'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

/**
 * Flat /onboarding — redirects to profile-scoped /onboarding/[profileId]
 */
export default function OnboardingRedirect() {
  const router = useRouter();
  const { activeProfile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (activeProfile?.id) {
      router.replace(`/onboarding/${activeProfile.id}`);
    } else {
      router.replace('/profiles');
    }
  }, [loading, activeProfile, router]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#080810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '2px solid rgba(0,200,255,0.1)',
        borderTop: '2px solid #00C8FF',
        animation: 'spinRing 0.9s linear infinite',
      }} />
    </div>
  );
}
