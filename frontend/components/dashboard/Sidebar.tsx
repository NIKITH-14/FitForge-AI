'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard, Dumbbell, Apple, History,
  Settings, LogOut, Users, ChevronRight, UtensilsCrossed
} from 'lucide-react';

interface SidebarProps {
  profileId: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview',   label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'workout',    label: 'Workout',     Icon: Dumbbell },
  { id: 'nutrition',  label: 'Nutrition',   Icon: Apple },
  { id: 'recipes',    label: 'Recipes',     Icon: UtensilsCrossed },
  { id: 'history',    label: 'History',     Icon: History },
  { id: 'settings',   label: 'Settings',    Icon: Settings },
];

export default function Sidebar({ profileId, activeSection, onSectionChange }: SidebarProps) {
  const { activeProfile, switchProfile, fullLogout } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 200 : 72,
        minHeight: '100vh',
        background: '#0a0a18',
        borderRight: '1px solid rgba(0,200,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'flex-start' : 'center',
        padding: '24px 0',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: expanded ? 160 : 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(123,47,247,0.3), rgba(0,200,255,0.2))',
          border: '1px solid rgba(0,200,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: expanded ? '0 20px 32px' : '0 auto 32px',
          gap: 10,
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => onSectionChange('overview')}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
        {expanded && (
          <span className="font-orbitron" style={{ fontSize: 13, fontWeight: 900, color: '#F0F4FF', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            FITFORGE
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: expanded ? '0 12px' : '0 14px', flex: 1 }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'rgba(0,200,255,0.1)' : 'transparent',
                color: isActive ? '#00C8FF' : '#7A8AAD',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left',
                borderLeft: isActive ? '3px solid #00C8FF' : '3px solid transparent',
                minHeight: 44,
                fontFamily: 'var(--font-exo2)',
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = '#F0F4FF';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#7A8AAD';
                }
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {expanded && label}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Profile + Signout */}
      <div style={{ width: '100%', padding: expanded ? '0 12px' : '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Profile chip */}
        {activeProfile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(123,47,247,0.08)',
            border: '1px solid rgba(123,47,247,0.2)',
            overflow: 'hidden',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{activeProfile.avatar_emoji || '👤'}</span>
            {expanded && (
              <div style={{ overflow: 'hidden' }}>
                <p className="font-exo2" style={{ fontSize: 13, fontWeight: 600, color: '#F0F4FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeProfile.name}
                </p>
                <p className="font-exo2" style={{ fontSize: 10, color: '#7A8AAD', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {activeProfile.fitness_goal?.replace('_', ' ') || '—'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Switch Profile */}
        <button
          onClick={switchProfile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            color: '#7A8AAD',
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%',
            minHeight: 44,
            fontFamily: 'var(--font-exo2)',
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(0,200,255,0.08)';
            e.currentTarget.style.color = '#00C8FF';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#7A8AAD';
          }}
        >
          <Users size={18} style={{ flexShrink: 0 }} />
          {expanded && 'Switch Profile'}
        </button>

        {/* Full Sign Out */}
        <button
          onClick={fullLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            color: '#7A8AAD',
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: '100%',
            minHeight: 44,
            fontFamily: 'var(--font-exo2)',
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,51,102,0.08)';
            e.currentTarget.style.color = '#FF6688';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#7A8AAD';
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {expanded && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
