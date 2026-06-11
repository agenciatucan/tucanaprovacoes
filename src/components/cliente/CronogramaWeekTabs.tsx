'use client';

import { useState } from 'react';
import PostCard from './PostCard';

interface Post {
  id: string;
  week_label: string | null;
  format: string | null;
  title: string | null;
  theme: string | null;
  objective: string | null;
  general_status: string | null;
  theme_status: string | null;
  caption_status: string | null;
  artwork_status: string | null;
  thumbnail_url?: string;
}

interface Props {
  weekKeys: string[];
  postsByWeek: Record<string, Post[]>;
  campaignId: string;
}

function hasPending(posts: Post[]) {
  return posts.some((post) => post.general_status === 'pendente');
}

export default function CronogramaWeekTabs({
  weekKeys,
  postsByWeek,
  campaignId,
}: Props) {
  const [activeWeek, setActiveWeek] = useState(
    weekKeys.find((week) => hasPending(postsByWeek[week] ?? [])) ?? weekKeys[0] ?? ''
  );

  const postsToShow = postsByWeek[activeWeek] ?? [];

  const approvedInWeek = postsToShow.filter((post) =>
    ['aprovado', 'finalizado'].includes(post.general_status ?? '')
  ).length;

  return (
    <div>
      <style>
        {`
          .client-week-tabs-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 18px;
          }

          .client-week-tabs-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
            max-width: 100%;
          }

          .client-week-tabs-scroll::-webkit-scrollbar {
            height: 6px;
          }

          .client-week-tabs-scroll::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, .12);
            border-radius: 999px;
          }

          .client-week-tabs {
            display: inline-flex;
            gap: 6px;
            background: var(--surface);
            padding: 5px;
            border-radius: 14px;
            border: 1px solid var(--line);
            min-width: max-content;
          }

          .client-week-tab-button {
            position: relative;
            height: 38px;
            padding: 0 15px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 800;
            transition: background .15s, color .15s;
            font-family: inherit;
            white-space: nowrap;
          }

          .client-week-tab-dot {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: var(--orange);
            border: 2px solid var(--surface);
          }

          .client-week-section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 16px;
          }

          .client-posts-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .client-week-empty {
            padding: 40px;
            text-align: center;
            color: var(--muted);
            background: var(--bg);
            border-radius: var(--r);
            border: 1px dashed var(--line);
          }

          @media (max-width: 980px) {
            .client-posts-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 640px) {
            .client-week-tabs-head {
              display: block;
              margin-bottom: 16px;
            }

            .client-week-tabs-scroll {
              margin-left: -2px;
              margin-right: -2px;
            }

            .client-week-section-title {
              align-items: flex-start;
              flex-direction: column;
              gap: 6px;
            }

            .client-week-section-title > div {
              display: none;
            }

            .client-posts-grid {
              grid-template-columns: 1fr;
              gap: 12px;
            }

            .client-week-empty {
              padding: 30px 18px;
            }
          }
        `}
      </style>

      <div className="client-week-tabs-head">
        <div className="client-week-tabs-scroll">
          <div className="client-week-tabs">
            {weekKeys.map((week) => {
              const count = postsByWeek[week]?.length ?? 0;
              const isActive = week === activeWeek;
              const weekHasPending = hasPending(postsByWeek[week] ?? []);

              return (
                <button
                  key={week}
                  type="button"
                  onClick={() => setActiveWeek(week)}
                  className="client-week-tab-button"
                  style={{
                    background: isActive ? 'var(--green)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--ink-2)',
                  }}
                >
                  {weekHasPending && <span className="client-week-tab-dot" />}
                  {week}
                  <span
                    style={{
                      marginLeft: 7,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 700,
                      background: isActive ? 'rgba(255,255,255,0.22)' : 'var(--bg-2)',
                      color: isActive ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="client-week-section-title">
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          {activeWeek}
        </h2>

        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />

        <span
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            fontWeight: 700,
          }}
        >
          {postsToShow.length} post{postsToShow.length !== 1 ? 's' : ''} ·{' '}
          {approvedInWeek} aprovado{approvedInWeek !== 1 ? 's' : ''}
        </span>
      </div>

      {postsToShow.length > 0 ? (
        <div className="client-posts-grid">
          {postsToShow.map((post) => (
            <PostCard key={post.id} post={post} campaignId={campaignId} />
          ))}
        </div>
      ) : (
        <div className="client-week-empty">
          Nenhum post cadastrado nesta semana ainda.
        </div>
      )}
    </div>
  );
}