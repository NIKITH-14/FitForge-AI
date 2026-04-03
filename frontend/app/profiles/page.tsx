'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import axios from 'axios';

interface Profile {
  id: string;
  name: string;
  avatar_emoji: string;
  fitness_goal?: string;
  has_completed_onboarding?: boolean;
  is_admin?: boolean;
  requires_pin?: boolean;
}

const GOAL_LABELS: Record<string, string> = {
  strength: 'Strength',
  aesthetic: 'Aesthetic',
  fat_loss: 'Fat Loss',
};

function GoalBadge({ goal }: { goal?: string }) {
  const cls = goal ? `goal-badge goal-${goal}` : 'goal-badge goal-default';
  return <span className={cls}>{goal ? GOAL_LABELS[goal] ?? goal : 'No Goal'}</span>;
}

export default function ProfilesPage() {
  const router = useRouter();
  const { setActiveProfile, accountToken } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const MACHINE_SECRET = process.env.NEXT_PUBLIC_MACHINE_SECRET || 'fallback_machine_secret';
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/machine/boot`,
          {},
          { headers: { 'x-machine-token': MACHINE_SECRET } }
        );
        setProfiles(res.data.profiles || []);
        if ((res.data.profiles || []).length === 0) {
          router.push('/setup');
        }
      } catch (e) {
        setError('Could not connect to Astraa system. Check your connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [router]);

  const handleSelectProfile = async (profile: Profile) => {
    if (!!profile.requires_pin) {
      sessionStorage.setItem('pendingProfileName', profile.name);
      router.push(`/profiles/${profile.id}/pin`);
      return;
    }
    setSelecting(profile.id);
    try {
      const MACHINE_SECRET = process.env.NEXT_PUBLIC_MACHINE_SECRET || 'fallback_machine_secret';
      // Use machine-token authenticated endpoint — no account login required for kiosk
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profiles/${profile.id}/select`,
        {},
        { headers: { 'x-machine-token': MACHINE_SECRET } }
      );
      setActiveProfile(profile, res.data.profileToken);
      router.push(`/dashboard/${profile.id}`);
    } catch (e) {
      console.error('Profile select error:', e);
    } finally {
      setSelecting(null);
    }
  };


  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#080810',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20
      }}>
        {/* Spinning ring loader */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '3px solid rgba(0,200,255,0.1)',
          borderTop: '3px solid #00C8FF',
          animation: 'spinRing 1s linear infinite'
        }} />
        <p className="font-exo2" style={{ color: '#7A8AAD', fontSize: 13, letterSpacing: '0.2em' }}>LOADING PROFILES</p>
      </div>
    );
  }

  return (
    <div
      className="animate-screen-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#080810',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        width: 800, height: 800,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,47,247,0.06) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56 }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p className="font-exo2" style={{ fontSize: 11, letterSpacing: '0.4em', color: '#7A8AAD', marginBottom: 16, textTransform: 'uppercase' }}>
            ASTRAA
          </p>
          <h1
            className="font-orbitron"
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: '#F0F4FF',
            }}
          >
            WHO&apos;S TRAINING?
          </h1>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            padding: '12px 24px',
            background: 'rgba(255,51,102,0.1)',
            border: '1px solid rgba(255,51,102,0.3)',
            borderRadius: 10,
            color: '#FF6688',
            fontSize: 14,
            fontFamily: 'var(--font-exo2)',
          }}>
            {error}
          </div>
        )}

        {/* Profile cards row */}
        <div style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '90vw',
          padding: '0 24px',
        }}>
          {/* Real profiles */}
          {profiles.map((profile, i) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              disabled={selecting === profile.id}
              className="profile-card animate-profile-in"
              style={{
                animationDelay: `${i * 0.1}s`,
                opacity: selecting && selecting !== profile.id ? 0.5 : 1,
                border: 'none',
                cursor: 'pointer',
                background: 'none',
              }}
            >
              <div className="profile-avatar">
                {profile.avatar_emoji || '👤'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span className="profile-name">{profile.name}</span>
                <GoalBadge goal={profile.fitness_goal} />
                {!!profile.requires_pin && (
                  <span style={{ fontSize: 10, color: '#7A8AAD', letterSpacing: '0.1em' }}>🔒 PIN</span>
                )}
              </div>
              {selecting === profile.id && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 14,
                  background: 'rgba(0,200,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: 20, height: 20,
                    border: '2px solid rgba(0,200,255,0.2)',
                    borderTop: '2px solid #00C8FF',
                    borderRadius: '50%',
                    animation: 'spinRing 0.8s linear infinite',
                  }} />
                </div>
              )}
            </button>
          ))}

          {/* Guest card */}
          <button
            onClick={() => router.push('/guest')}
            className="profile-card profile-card-guest animate-profile-in"
            style={{
              animationDelay: `${profiles.length * 0.1}s`,
              border: 'none',
              cursor: 'pointer',
              background: 'none',
            }}
          >
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              border: '2px dashed rgba(122,138,173,0.35)',
              background: 'rgba(122,138,173,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}>
              👻
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span className="profile-name" style={{ color: '#7A8AAD' }}>Guest</span>
              <span style={{ fontSize: 10, color: '#7A8AAD', letterSpacing: '0.1em', fontFamily: 'var(--font-exo2)' }}>
                TEMPORARY
              </span>
            </div>
          </button>

          {/* Add Profile card */}
          <button
            onClick={() => router.push('/setup?mode=add-profile')}
            className="profile-card profile-card-add animate-profile-in"
            style={{
              animationDelay: `${(profiles.length + 1) * 0.1}s`,
              border: 'none',
              cursor: 'pointer',
              background: 'none',
            }}
          >
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              border: '2px dashed rgba(123,47,247,0.4)',
              background: 'rgba(123,47,247,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              color: '#7B2FF7',
              transition: 'all 0.25s',
            }}>
              +
            </div>
            <span className="profile-name" style={{ color: '#7B2FF7' }}>Add Profile</span>
          </button>
        </div>

        {/* Manage Profiles */}
        <button
          onClick={() => router.push('/setup?mode=manage')}
          className="font-exo2"
          style={{
            background: 'none',
            border: 'none',
            color: '#7A8AAD',
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.1em',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            transition: 'color 0.2s',
            minHeight: 44,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F0F4FF')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7A8AAD')}
        >
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
