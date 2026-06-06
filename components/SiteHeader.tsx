import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="text-xl" aria-hidden>
            🧳
          </span>
          <span className="text-lg tracking-tight">Luggist</span>
        </Link>
      </div>
    </header>
  );
}
