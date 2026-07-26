'use client';

/*
  Last-resort boundary: fires when the root layout itself throws. It must
  render its own <html>/<body> because the normal layout didn't mount.
  Kept dependency-free so it can't fail for the same reason the app did.
*/
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#fff', border: '1px solid #fee2e2', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>The application failed to load</h1>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px' }}>
              A critical error occurred while starting the app.{error?.digest ? ` Reference: ${error.digest}` : ''}
            </p>
            <button onClick={reset} style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 14, cursor: 'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
