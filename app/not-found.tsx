import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card animate-rise mt-2 border border-base-300/70 bg-base-100/80 backdrop-blur">
      <div className="card-body items-center px-6 py-16 text-center">
        <span className="animate-float text-6xl" aria-hidden>
          🧭
        </span>
        <h1 className="font-display mt-4 text-xl font-semibold text-base-content">
          There&apos;s nothing at this address
        </h1>
        <p className="mt-1 max-w-xs text-sm text-base-content/60">
          The page you&apos;re looking for doesn&apos;t exist — it may have been
          moved or deleted.
        </p>
        <Link href="/" className="btn btn-primary mt-5">
          Back to trips
        </Link>
      </div>
    </div>
  );
}
