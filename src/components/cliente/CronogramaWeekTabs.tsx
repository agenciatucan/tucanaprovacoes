'use client';
import { useState } from 'react';
import PostCard from './PostCard';

interface Post {
  id: string;
  week_label: string;
  format: string;
  title: string;
  theme: string | null;
  objective: string | null;
  general_status: string;
  theme_status: string;
  caption_status: string;
  artwork_status: string;
}

interface Props {
  weekKeys: string[];
  postsByWeek: Record<string, Post[]>;
  campaignId: string;
}

export default function CronogramaWeekTabs({ weekKeys, postsByWeek, campaignId }: Props) {
  const [activeWeek, setActiveWeek] = useState(weekKeys[0] ?? '');
  const postsToShow = postsByWeek[activeWeek] ?? [];

  return (
    <div>
      {/* Week tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 12, border: '1px solid var(--line)' }}>
          {weekKeys.map((week) => {
            const count = postsByWeek[week]?.length ?? 0;
            const isActive = week === activeWeek;
            return (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
                style={{
                  height: 36,
                  padding: '0 14px',
                  background: isActive ? 'var(--green)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--ink-2)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background .15s, color .15s',
                  fontFamily: 'inherit',
                }}>
                {week}
                <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 11 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          {activeWeek}
        </h2>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          {postsToShow.length} post{postsToShow.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Posts grid */}
      {postsToShow.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {postsToShow.map((post) => (
            <PostCard key={post.id} post={post} campaignId={campaignId} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: 'var(--bg)', borderRadius: 'var(--r)', border: '1px dashed var(--line)' }}>
          Nenhum post cadastrado nesta semana ainda.
        </div>
      )}
    </div>
  );
}
