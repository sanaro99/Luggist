"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card animate-rise mt-2 border border-base-300/70 bg-base-100/80 backdrop-blur">
      <div className="card-body items-center px-6 py-16 text-center">
        <span className="text-6xl" aria-hidden>
          🛬
        </span>
        <h1 className="font-display mt-4 text-xl font-semibold text-base-content">
          Something went wrong
        </h1>
        <p className="mt-1 max-w-xs text-sm text-base-content/60">
          The screen hit an unexpected error. Your packing lists are stored on
          this device and are safe.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost border border-base-300">
            Back to trips
          </Link>
        </div>
      </div>
    </div>
  );
}
