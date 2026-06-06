"use client";

import { useEffect } from "react";
import { ensureSeeded } from "@/lib/seed";

/** Seeds default categories on first load. Renders nothing. */
export default function AppInit() {
  useEffect(() => {
    ensureSeeded().catch((err) => console.error("Failed to seed database", err));
  }, []);
  return null;
}
