"use client";

import { useEffect } from "react";
import { ensureSeeded } from "@/lib/seed";
import { ensureTemplatesSeeded } from "@/lib/templates";

/** Seeds default categories and starter templates on first load. Renders nothing. */
export default function AppInit() {
  useEffect(() => {
    ensureSeeded().catch((err) => console.error("Failed to seed database", err));
    ensureTemplatesSeeded().catch((err) =>
      console.error("Failed to seed templates", err),
    );
  }, []);
  return null;
}
