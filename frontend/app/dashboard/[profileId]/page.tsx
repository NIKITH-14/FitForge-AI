'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import HeroBanner from '@/components/dashboard/HeroBanner';
import TodayWorkout from '@/components/dashboard/TodayWorkout';
import WeekPlan from '@/components/dashboard/WeekPlan';
import BodyStats from '@/components/dashboard/BodyStats';
import NutritionPanel from '@/components/dashboard/NutritionPanel';
import SessionHistory from '@/components/dashboard/SessionHistory';
import FoodScanner from '@/components/dashboard/FoodScanner';
import FormAnalysis from '@/components/dashboard/FormAnalysis';
import AIRecommendations from '@/components/dashboard/AIRecommendations';
import RecipeRecommendations from '@/components/dashboard/RecipeRecommendations';

const SIDEBAR_COLLAPSED = 72;

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.profileId as string;
  const { activeProfile, profileToken, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Validate: profile in URL must match active profile in context
  useEffect(() => {
    if (loading) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] Guard check:', {
        loading,
        hasToken: !!profileToken,
        hasProfile: !!activeProfile,
        profileId,
        activeId: activeProfile?.id,
        onboarded: activeProfile?.has_completed_onboarding,
        isGuest: activeProfile?.is_guest,
      });
    }

    if (!profileToken || !activeProfile) {
      if (process.env.NODE_ENV === 'development') console.log('[Dashboard] Redirect → /profiles (no token or no profile)');
      router.replace('/profiles');
      return;
    }

    if (profileId && activeProfile.id !== profileId) {
      if (process.env.NODE_ENV === 'development') console.log('[Dashboard] Redirect → correct URL (profile mismatch)', activeProfile.id, '≠', profileId);
      router.replace(`/dashboard/${activeProfile.id}`);
      return;
    }

    if (!activeProfile.has_completed_onboarding && !activeProfile.is_guest) {
      if (process.env.NODE_ENV === 'development') console.log('[Dashboard] Redirect → /onboarding (onboarding incomplete)', activeProfile.id);
      router.replace(`/onboarding/${activeProfile.id}`);
      return;
    }
  }, [loading, profileToken, activeProfile, profileId, router]);

  // Scroll to section
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    const el = document.getElementById(`section-${section}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading || !activeProfile) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#080810',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(0,200,255,0.1)',
          borderTop: '3px solid #00C8FF',
          animation: 'spinRing 0.9s linear infinite',
        }} />
        <p className="font-exo2" style={{ color: '#7A8AAD', fontSize: 12, letterSpacing: '0.2em' }}>
          LOADING DASHBOARD
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080810', position: 'relative' }}>
      {/* ── Sidebar ── */}
      <Sidebar
        profileId={profileId}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      {/* ── Main content ── */}
      <main
        className="allow-scroll"
        style={{
          marginLeft: SIDEBAR_COLLAPSED,
          flex: 1,
          minHeight: '100vh',
          overflowY: 'auto',
          padding: '40px 40px 80px',
          maxWidth: `calc(100vw - ${SIDEBAR_COLLAPSED}px)`,
          position: 'relative',
        }}
      >
        {/* Background ambient glow */}
        <div style={{
          position: 'fixed',
          top: '20%', left: '30%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,47,247,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

          {/* ── Hero Banner (always visible at top) ── */}
          <div id="section-overview" className="animate-fade-up">
            <HeroBanner onNavigate={handleSectionChange} />
          </div>

          {/* ── Today + Week side by side ── */}
          <div id="section-workout" className="animate-fade-up delay-100" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 32 }}>
            <TodayWorkout />
            <WeekPlan />
          </div>

          {/* ── Body Stats + Nutrition side by side ── */}
          <div className="animate-fade-up delay-200" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, marginBottom: 32 }}>
            <BodyStats />
            <div id="section-nutrition" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <NutritionPanel />
              <FoodScanner />
            </div>
          </div>

          {/* ── AI & Form Analysis side by side ── */}
          <div className="animate-fade-up delay-300" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, marginBottom: 32 }}>
            <FormAnalysis />
            <AIRecommendations />
          </div>

          {/* ── Recipe Recommendations ── */}
          <div id="section-recipes" className="animate-fade-up delay-350" style={{ marginBottom: 32 }}>
            <RecipeRecommendations />
          </div>

          {/* ── Session History ── */}
          <div id="section-history" className="animate-fade-up delay-400" style={{ marginBottom: 32 }}>
            <SessionHistory />
          </div>

          {/* ── Settings placeholder ── */}
          <div id="section-settings" className="animate-fade-up delay-500" style={{ marginBottom: 32 }}>
            <div className="glass-card" style={{ padding: '28px 24px' }}>
              <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
                Coming Soon
              </p>
              <h2 className="font-orbitron" style={{ fontSize: 16, fontWeight: 700, color: '#F0F4FF', marginBottom: 12 }}>
                Profile Settings
              </h2>
              <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD' }}>
                Update your weight, change fitness goal, and manage your PIN here. Coming in Phase 5.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
