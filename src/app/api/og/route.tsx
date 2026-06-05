import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#25411e',
          position: 'relative',
        }}
      >
        {/* Círculo decorativo */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(235, 96, 19, 0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
          }}
        />

        {/* Conteúdo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            position: 'relative',
          }}
        >
          {/* Ícone T */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: '#eb6013',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            T
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.03em',
              }}
            >
              Portal Tucan
            </div>
            <div
              style={{
                fontSize: 26,
                color: 'rgba(255,255,255,0.65)',
                fontWeight: 400,
              }}
            >
              Portal de aprovação de conteúdo
            </div>
          </div>

          {/* Tag */}
          <div
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            TUCAN MARKETING DIGITAL
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
