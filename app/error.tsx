'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="main" style={{ maxWidth: 640, margin: '40px auto' }}>
      <div className="card" style={{ alignItems: 'flex-start', padding: 28 }}>
        <h1 className="title">Something went wrong loading this page</h1>
        <p className="muted">Try again. If it keeps happening, share this code with the team: {error.digest ?? 'no code'}.</p>
        <button type="button" className="btn primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
