"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="font-mono text-sm text-amber">This view hit an error.</p>
        <button type="button" onClick={reset} className="mt-4 border border-cyan px-4 py-2 font-mono text-xs text-cyan">
          Try again
        </button>
      </div>
    </main>
  );
}
