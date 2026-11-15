import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <p className="font-mono text-sm text-cyan">404 / SIGNAL LOST</p>
      <Link href="/" className="font-mono text-xs tracking-wider text-ink uppercase">
        Return home
      </Link>
    </main>
  );
}
