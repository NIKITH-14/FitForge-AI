'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
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

// ── Small icon buttons used in management mode ─────────────────────────────
function IconBtn({
  title,
  onClick,
  danger,
  disabled,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      disabled={disabled}
      style={{
        background: danger ? 'rgba(255,51,102,0.15)' : 'rgba(0,200,255,0.1)',
        border: `1px solid ${danger ? 'rgba(255,51,102,0.35)' : 'rgba(0,200,255,0.25)'}`,
        borderRadius: 8,
        color: danger ? '#FF6688' : '#00C8FF',
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

export default function ProfilesPage() {
  const router = useRouter();
  const { setActiveProfile, clearProfile, activeProfile, accountToken } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);

  // ── Management mode state ────────────────────────────────────────────────
  const [managementMode, setManagementMode] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ── Bulk cleanup state ───────────────────────────────────────────────────
  // Phase 1: show initial confirm. Phase 2: user types "DELETE" to confirm.
  const [bulkConfirmPhase, setBulkConfirmPhase] = useState<0 | 1 | 2>(0);
  const [bulkConfirmText, setBulkConfirmText] = useState('');

  // ── Load profiles ────────────────────────────────────────────────────────
  const fetchProfiles = async () => {
    try {
      const MACHINE_SECRET = process.env.NEXT_PUBLIC_MACHINE_SECRET || 'fallback_machine_secret';
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/machine/boot`,
        {},
        { headers: { 'x-machine-token': MACHINE_SECRET } }
      );
      setProfiles(res.data.profiles || []);
      if (process.env.NODE_ENV === 'development') {
        console.log('[Profiles] Loaded:', res.data.profiles?.length ?? 0, 'profiles');
      }
      if ((res.data.profiles || []).length === 0) {
        router.push('/setup');
      }
    } catch {
      setError('Could not connect to Astraa system. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, [router]);

  // Auto-focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // ── Profile selection ────────────────────────────────────────────────────
  const handleSelectProfile = async (profile: Profile) => {
    if (managementMode) return; // Disable selection while managing

    if (!!profile.requires_pin) {
      sessionStorage.setItem('pendingProfileName', profile.name);
      router.push(`/profiles/${profile.id}/pin`);
      return;
    }
    setSelecting(profile.id);
    try {
      const MACHINE_SECRET = process.env.NEXT_PUBLIC_MACHINE_SECRET || 'fallback_machine_secret';
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

  // ── Management: toggle mode ──────────────────────────────────────────────
  const toggleManagementMode = () => {
    setManagementMode((v) => !v);
    setRenamingId(null);
    setDeleteConfirmId(null);
    setBulkConfirmPhase(0);
    setBulkConfirmText('');
  };

  // ── Management: start rename ─────────────────────────────────────────────
  const startRename = (profile: Profile) => {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
    setDeleteConfirmId(null);
    setBulkConfirmPhase(0);
  };

  // ── Management: commit rename ────────────────────────────────────────────
  const commitRename = async (profileId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length < 2) return;

    const original = profiles.find((p) => p.id === profileId);
    if (!original || trimmed === original.name) {
      setRenamingId(null);
      return;
    }

    setActionPending(true);
    try {
      await api.put(`/profiles/${profileId}`, { name: trimmed });
      setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, name: trimmed } : p));
    } catch (e) {
      console.error('[Profiles] Rename failed:', e);
    } finally {
      setActionPending(false);
      setRenamingId(null);
    }
  };

  // ── Management: cancel rename ────────────────────────────────────────────
  const cancelRename = () => setRenamingId(null);

  // ── Management: confirm delete (per-profile) ─────────────────────────────
  const handleDeleteConfirmed = async () => {
    const id = deleteConfirmId;
    if (!id) return;

    setActionPending(true);
    try {
      await api.delete(`/profiles/${id}`);
      if (activeProfile?.id === id) {
        clearProfile();
      }
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[Profiles] Delete failed:', e);
    } finally {
      setActionPending(false);
      setDeleteConfirmId(null);
    }
  };

  // ── Bulk cleanup ─────────────────────────────────────────────────────────
  const nonOwnerCount = profiles.filter((p) => !p.is_admin).length;

  const handleBulkCleanupConfirmed = async () => {
    if (bulkConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setActionPending(true);
    try {
      const res = await api.delete('/profiles/bulk-cleanup');
      const deletedIds = profiles.filter((p) => !p.is_admin).map((p) => p.id);

      // If active profile was among deleted, clear session
      if (activeProfile && deletedIds.includes(activeProfile.id)) {
        clearProfile();
      }

      // Re-fetch profiles from server (not just local splice) — ensures DB state
      await fetchProfiles();

      if (process.env.NODE_ENV === 'development') {
        console.log('[Profiles] Bulk cleanup result:', res.data);
      }
    } catch (e) {
      console.error('[Profiles] Bulk cleanup failed:', e);
    } finally {
      setActionPending(false);
      setBulkConfirmPhase(0);
      setBulkConfirmText('');
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#080810',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20
      }}>
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

  // ── Delete Confirmation Modal (per-profile) ──────────────────────────────
  const deleteTarget = profiles.find((p) => p.id === deleteConfirmId);

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
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>

        {/* Header row */}
        <div style={{ textAlign: 'center', position: 'relative', width: '100%' }}>
          <p className="font-exo2" style={{ fontSize: 11, letterSpacing: '0.4em', color: '#7A8AAD', marginBottom: 16, textTransform: 'uppercase' }}>
            ASTRAA
          </p>
          <h1
            className="font-orbitron"
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: managementMode ? '#7B2FF7' : '#F0F4FF',
              transition: 'color 0.3s',
            }}
          >
            {managementMode ? 'MANAGE PROFILES' : 'WHO\'S TRAINING?'}
          </h1>
          {managementMode && (
            <p className="font-exo2" style={{ fontSize: 11, color: '#7A8AAD', marginTop: 8, letterSpacing: '0.1em' }}>
              Rename or remove profiles below
            </p>
          )}
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
          {profiles.map((profile, i) => {
            const isRenaming = renamingId === profile.id;
            const isSelecting = selecting === profile.id;
            const isAdmin = !!profile.is_admin;

            return (
              <div
                key={profile.id}
                className="profile-card animate-profile-in"
                onClick={() => handleSelectProfile(profile)}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  opacity: (selecting && !isSelecting) ? 0.5 : 1,
                  cursor: managementMode ? 'default' : 'pointer',
                  border: managementMode
                    ? '2px solid rgba(123,47,247,0.35)'
                    : '2px solid rgba(0,200,255,0.1)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  minHeight: managementMode ? 200 : 170,
                  overflow: 'visible',
                }}
              >
                {/* Avatar */}
                <div className="profile-avatar">
                  {profile.avatar_emoji || '👤'}
                </div>

                {/* Name / Rename input */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
                  {isRenaming ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', padding: '0 4px' }}
                    >
                      <input
                        ref={renameInputRef}
                        className="input-field font-exo2"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(profile.id);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        maxLength={40}
                        style={{
                          fontSize: 13,
                          padding: '6px 10px',
                          minHeight: 34,
                          textAlign: 'center',
                          width: '100%',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); commitRename(profile.id); }}
                          disabled={actionPending}
                          className="font-exo2"
                          style={{
                            background: 'rgba(0,200,255,0.15)',
                            border: '1px solid rgba(0,200,255,0.35)',
                            borderRadius: 6,
                            color: '#00C8FF',
                            fontSize: 11,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                          className="font-exo2"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: '#7A8AAD',
                            fontSize: 11,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="profile-name">{profile.name}</span>
                      <GoalBadge goal={profile.fitness_goal} />
                      {!!profile.requires_pin && (
                        <span style={{ fontSize: 10, color: '#7A8AAD', letterSpacing: '0.1em' }}>🔒 PIN</span>
                      )}
                      {isAdmin && (
                        <span style={{ fontSize: 9, color: '#7B2FF7', letterSpacing: '0.12em', fontFamily: 'var(--font-exo2)', textTransform: 'uppercase' }}>
                          Owner
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Management action buttons */}
                {managementMode && !isRenaming && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 8,
                      justifyContent: 'center',
                    }}
                  >
                    <IconBtn
                      title="Rename profile"
                      onClick={() => startRename(profile)}
                      disabled={actionPending}
                    >
                      ✏️
                    </IconBtn>
                    <IconBtn
                      title={isAdmin ? 'Cannot delete owner profile' : 'Delete profile'}
                      onClick={() => {
                        if (!isAdmin) setDeleteConfirmId(profile.id);
                      }}
                      danger
                      disabled={isAdmin || actionPending}
                    >
                      🗑️
                    </IconBtn>
                  </div>
                )}

                {/* Selecting spinner overlay */}
                {isSelecting && (
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
              </div>
            );
          })}

          {/* Guest card — hidden in management mode */}
          {!managementMode && (
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
          )}

          {/* Add Profile card — hidden in management mode */}
          {!managementMode && (
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
          )}
        </div>

        {/* Bottom row: Manage / Done + Bulk Cleanup */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleManagementMode}
            className="font-exo2"
            style={{
              background: managementMode ? 'rgba(0,200,255,0.1)' : 'none',
              border: managementMode ? '1px solid rgba(0,200,255,0.3)' : 'none',
              color: managementMode ? '#00C8FF' : '#7A8AAD',
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: '0.1em',
              padding: '12px 28px',
              borderRadius: 8,
              transition: 'all 0.25s',
              minHeight: 44,
            }}
            onMouseEnter={(e) => { if (!managementMode) e.currentTarget.style.color = '#F0F4FF'; }}
            onMouseLeave={(e) => { if (!managementMode) e.currentTarget.style.color = '#7A8AAD'; }}
          >
            {managementMode ? '✓ Done' : 'Manage Profiles'}
          </button>

          {/* Bulk Cleanup button — only visible in management mode when non-owner profiles exist */}
          {managementMode && nonOwnerCount > 0 && (
            <button
              onClick={() => { setBulkConfirmPhase(1); setBulkConfirmText(''); }}
              disabled={actionPending}
              className="font-exo2"
              style={{
                background: 'rgba(255,51,102,0.08)',
                border: '1px solid rgba(255,51,102,0.25)',
                color: '#FF6688',
                fontSize: 12,
                cursor: actionPending ? 'not-allowed' : 'pointer',
                letterSpacing: '0.08em',
                padding: '8px 20px',
                borderRadius: 8,
                transition: 'all 0.25s',
                minHeight: 36,
                opacity: actionPending ? 0.5 : 1,
              }}
            >
              🧹 Delete All Non-Owner Profiles ({nonOwnerCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Per-profile Delete Confirmation Modal ──────────────────────────────── */}
      {deleteConfirmId && deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8,8,16,0.82)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => { if (!actionPending) setDeleteConfirmId(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(16,16,31,0.95)',
              border: '1px solid rgba(255,51,102,0.3)',
              borderRadius: 20,
              padding: '36px 40px',
              maxWidth: 380,
              width: '90vw',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              boxShadow: '0 0 60px rgba(255,51,102,0.15)',
            }}
          >
            <div style={{ fontSize: 40 }}>{deleteTarget.avatar_emoji || '👤'}</div>
            <div style={{ textAlign: 'center' }}>
              <h2 className="font-orbitron" style={{ fontSize: 18, fontWeight: 700, color: '#F0F4FF', marginBottom: 10 }}>
                Delete Profile?
              </h2>
              <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', lineHeight: 1.6 }}>
                <span style={{ color: '#FF6688', fontWeight: 700 }}>{deleteTarget.name}</span> and all their data will be permanently removed.
                {activeProfile?.id === deleteTarget.id && (
                  <><br /><span style={{ color: '#FFB020', fontSize: 12 }}>This is your current active session — it will be cleared.</span></>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={actionPending}
                className="font-exo2 btn-secondary"
                style={{ flex: 1, fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={actionPending}
                className="font-exo2"
                style={{
                  flex: 1,
                  background: 'rgba(255,51,102,0.2)',
                  border: '1px solid rgba(255,51,102,0.5)',
                  borderRadius: 10,
                  color: '#FF6688',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '11px',
                  cursor: actionPending ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.05em',
                  opacity: actionPending ? 0.6 : 1,
                  minHeight: 44,
                }}
              >
                {actionPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Cleanup Confirmation Modal (2-phase) ───────────────────────────── */}
      {bulkConfirmPhase > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8,8,16,0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => { if (!actionPending) { setBulkConfirmPhase(0); setBulkConfirmText(''); } }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(16,16,31,0.97)',
              border: '1px solid rgba(255,51,102,0.4)',
              borderRadius: 20,
              padding: '36px 40px',
              maxWidth: 420,
              width: '92vw',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              boxShadow: '0 0 80px rgba(255,51,102,0.2)',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,51,102,0.15)',
              border: '1px solid rgba(255,51,102,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>
              🧹
            </div>

            <div style={{ textAlign: 'center' }}>
              <h2 className="font-orbitron" style={{ fontSize: 17, fontWeight: 700, color: '#F0F4FF', marginBottom: 10 }}>
                Delete All Non-Owner Profiles?
              </h2>
              <p className="font-exo2" style={{ fontSize: 13, color: '#7A8AAD', lineHeight: 1.7, marginBottom: 8 }}>
                This will permanently delete{' '}
                <span style={{ color: '#FF6688', fontWeight: 700 }}>{nonOwnerCount} profile{nonOwnerCount !== 1 ? 's' : ''}</span>{' '}
                and all their associated data (BMI records, workouts, nutrition targets).
              </p>
              <p className="font-exo2" style={{ fontSize: 12, color: '#FFB020', lineHeight: 1.5 }}>
                ⚠️ The owner profile will be preserved. This action cannot be undone.
              </p>
            </div>

            {/* Phase 2: type DELETE to confirm */}
            {bulkConfirmPhase === 2 && (
              <div style={{ width: '100%' }}>
                <p className="font-exo2" style={{ fontSize: 12, color: '#7A8AAD', marginBottom: 8, textAlign: 'center' }}>
                  Type <span style={{ color: '#FF6688', fontWeight: 700, fontFamily: 'monospace' }}>DELETE</span> to confirm:
                </p>
                <input
                  autoFocus
                  className="input-field font-exo2"
                  value={bulkConfirmText}
                  onChange={(e) => setBulkConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, letterSpacing: '0.2em', color: '#FF6688' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                onClick={() => { setBulkConfirmPhase(0); setBulkConfirmText(''); }}
                disabled={actionPending}
                className="font-exo2 btn-secondary"
                style={{ flex: 1, fontSize: 13 }}
              >
                Cancel
              </button>

              {bulkConfirmPhase === 1 ? (
                <button
                  onClick={() => setBulkConfirmPhase(2)}
                  className="font-exo2"
                  style={{
                    flex: 1,
                    background: 'rgba(255,51,102,0.15)',
                    border: '1px solid rgba(255,51,102,0.4)',
                    borderRadius: 10,
                    color: '#FF6688',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '11px',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                    minHeight: 44,
                  }}
                >
                  I understand, continue →
                </button>
              ) : (
                <button
                  onClick={handleBulkCleanupConfirmed}
                  disabled={actionPending || bulkConfirmText.trim().toUpperCase() !== 'DELETE'}
                  className="font-exo2"
                  style={{
                    flex: 1,
                    background: bulkConfirmText.trim().toUpperCase() === 'DELETE'
                      ? 'rgba(255,51,102,0.25)'
                      : 'rgba(255,51,102,0.06)',
                    border: '1px solid rgba(255,51,102,0.5)',
                    borderRadius: 10,
                    color: '#FF6688',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '11px',
                    cursor: (actionPending || bulkConfirmText.trim().toUpperCase() !== 'DELETE') ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.05em',
                    opacity: (actionPending || bulkConfirmText.trim().toUpperCase() !== 'DELETE') ? 0.4 : 1,
                    minHeight: 44,
                    transition: 'all 0.2s',
                  }}
                >
                  {actionPending ? 'Deleting…' : `Delete ${nonOwnerCount} Profile${nonOwnerCount !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
