import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="glass sticky top-0 z-30 border-b border-base-300/70">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Luggist home"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-2xl bg-sunset text-lg shadow-sm transition-transform group-hover:-rotate-6 group-hover:scale-105"
            aria-hidden
          >
            🧳
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-gradient-sunset">
            Luggist
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
