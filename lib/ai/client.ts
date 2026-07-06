// Client-side AI helpers. The ONLY AI module a client component imports — it
// just POSTs to /api/ai (the server gateway owns provider config + secrets).
// Includes offline heuristics so quick-add and categorization keep working with
// no network / no key (Luggist's offline-first promise).

import type { TemplateContainer, TemplateData, TemplateItem } from "@/lib/types";

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function postTask<T>(task: string, payload: unknown): Promise<AiResult<T>> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: json?.error || `Request failed (${res.status}).` };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Network error." };
  }
}

/* --------------------------- Offline heuristics ----------------------- */

const KEYWORD_CATEGORY: { match: RegExp; category: string }[] = [
  {
    match:
      /shirt|t-?shirt|trouser|pant|jean|sock|underwear|jacket|sweater|dress|short|hoodie|shoe|boot|sandal|flip|hat|cap|scarf|glove|swimsuit|swim|bikini|coat|belt|pajama|legging|skirt|blouse|cloth/i,
    category: "Clothes",
  },
  {
    match:
      /charger|cable|laptop|phone|adapter|adaptor|power\s?bank|headphone|earbud|camera|tablet|kindle|battery|usb|plug|console|mouse|keyboard|electronic/i,
    category: "Electronics",
  },
  {
    match:
      /toothbrush|toothpaste|shampoo|conditioner|soap|deodorant|sunscreen|razor|shaver|lotion|moisturi|perfume|cologne|makeup|cosmetic|comb|floss|toiletr|wash|towel/i,
    category: "Toiletries",
  },
  {
    match:
      /passport|visa|ticket|boarding|licen[cs]e|insurance|document|wallet|card|cash|currency|itinerary|reservation|booking/i,
    category: "Documents",
  },
  {
    match:
      /medicine|medication|\bpill|vitamin|first\s?aid|bandage|painkiller|ibuprofen|paracetamol|prescription|\bmask|sanitiz|sanitis|repellent|sunburn|health/i,
    category: "Health",
  },
];

/** Best-guess category for an item name, or null if nothing matches. Offline. */
export function categorizeOffline(name: string): string | null {
  const n = name.toLowerCase();
  for (const { match, category } of KEYWORD_CATEGORY) {
    if (match.test(n)) return category;
  }
  return null;
}

export interface ParsedItem {
  name: string;
  quantity: number;
  categoryName: string | null;
}

/** Splits free text into items + quantities + best-guess category. Offline. */
export function parseQuickAddOffline(text: string): ParsedItem[] {
  return text
    .split(/\s*(?:,|\band\b|\+|\n|;)\s*/gi)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      let quantity = 1;
      let name = chunk;
      const lead = chunk.match(/^(\d{1,3})\s*x?\s+(.+)$/i); // "3 shirts" / "3x shirts"
      const trail = chunk.match(/^(.+?)\s*x\s*(\d{1,3})$/i); // "shirts x3"
      if (lead) {
        quantity = Math.max(1, parseInt(lead[1], 10));
        name = lead[2].trim();
      } else if (trail) {
        quantity = Math.max(1, parseInt(trail[2], 10));
        name = trail[1].trim();
      }
      return { name, quantity, categoryName: categorizeOffline(name) };
    })
    .filter((p) => p.name.length > 0);
}

/* ------------------------------- Features ----------------------------- */

/**
 * B3: parse free text into items. Tries the AI gateway, then falls back to the
 * offline heuristic on any failure — so it NEVER throws and always returns
 * something usable, online or off.
 */
export async function aiParseQuickAdd(text: string): Promise<ParsedItem[]> {
  const res = await postTask<{ items?: unknown }>("parseQuickAdd", { text });
  if (res.ok && Array.isArray(res.data.items) && res.data.items.length > 0) {
    const items = (res.data.items as Record<string, unknown>[])
      .map((it) => {
        const name = String(it?.name ?? "").trim();
        return {
          name,
          quantity: Math.max(1, Math.round(Number(it?.quantity) || 1)),
          categoryName:
            typeof it?.categoryName === "string" && it.categoryName.trim()
              ? it.categoryName.trim()
              : categorizeOffline(name),
        };
      })
      .filter((p) => p.name.length > 0);
    if (items.length > 0) return items;
  }
  return parseQuickAddOffline(text);
}

export interface AuditSuggestion {
  name: string;
  categoryName: string | null;
}

/** B2: suggest missing items for a trip. */
export async function aiAudit(input: {
  destination?: string;
  season?: string;
  existingNames?: string[];
}): Promise<AiResult<AuditSuggestion[]>> {
  const res = await postTask<{ suggestions?: unknown }>("audit", input);
  if (!res.ok) return res;
  const list = Array.isArray(res.data.suggestions) ? res.data.suggestions : [];
  const existing = new Set(
    (input.existingNames ?? []).map((n) => n.toLowerCase().trim()),
  );
  const suggestions = (list as Record<string, unknown>[])
    .map((s) => ({
      name: String(s?.name ?? "").trim(),
      categoryName:
        typeof s?.categoryName === "string" && s.categoryName.trim()
          ? s.categoryName.trim()
          : null,
    }))
    .filter((s) => s.name && !existing.has(s.name.toLowerCase()));
  if (suggestions.length === 0) {
    return { ok: false, error: "No new suggestions — your list looks thorough!" };
  }
  return { ok: true, data: suggestions };
}

/** B1: generate a full packing list as TemplateData (fed to applyTemplateData). */
export async function aiGenerateList(input: {
  destination?: string;
  durationDays?: number;
  notes?: string;
}): Promise<AiResult<TemplateData>> {
  const res = await postTask<{ containers?: unknown; items?: unknown }>(
    "generateList",
    input,
  );
  if (!res.ok) return res;
  const data = normalizeTemplateData(res.data);
  if (data.containers.length === 0 && data.items.length === 0) {
    return { ok: false, error: "The AI didn't return a usable list. Try again." };
  }
  return { ok: true, data };
}

/** B4 (optional AI path): categorize a batch of item names. */
export async function aiCategorize(
  names: string[],
): Promise<AiResult<Record<string, string>>> {
  const res = await postTask<{ assignments?: unknown }>("categorize", { names });
  if (!res.ok) return res;
  const list = Array.isArray(res.data.assignments) ? res.data.assignments : [];
  const map: Record<string, string> = {};
  for (const a of list as Record<string, unknown>[]) {
    const name = String(a?.name ?? "").trim();
    const category = String(a?.categoryName ?? "").trim();
    if (name && category) map[name.toLowerCase()] = category;
  }
  return { ok: true, data: map };
}

/**
 * Sanitizes raw model output into valid TemplateData: clean tempIds, valid
 * kinds, cube→bag parenting only, dropped dangling refs, sane quantities.
 */
function normalizeTemplateData(raw: {
  containers?: unknown;
  items?: unknown;
}): TemplateData {
  const rawContainers = (
    Array.isArray(raw.containers) ? raw.containers : []
  ) as Record<string, unknown>[];
  const rawItems = (Array.isArray(raw.items) ? raw.items : []) as Record<
    string,
    unknown
  >[];

  const idMap = new Map<string, string>(); // model tempId -> our tempId
  const parentRef = new Map<string, string | null>(); // our tempId -> model parent tempId
  const containers: TemplateContainer[] = [];
  let order = 0;

  for (const c of rawContainers) {
    const name = String(c?.name ?? "").trim();
    if (!name) continue;
    const modelId = c?.tempId != null ? String(c.tempId) : `__c${order}`;
    const tempId = crypto.randomUUID();
    idMap.set(modelId, tempId);
    parentRef.set(tempId, c?.parentTempId != null ? String(c.parentTempId) : null);
    containers.push({
      tempId,
      parentTempId: null,
      kind: c?.kind === "cube" ? "cube" : "bag",
      name,
      color: typeof c?.color === "string" ? c.color : undefined,
      sortOrder: order++,
    });
  }

  const byTempId = new Map(containers.map((c) => [c.tempId, c]));
  for (const c of containers) {
    if (c.kind !== "cube") continue;
    const modelParent = parentRef.get(c.tempId);
    const resolved = modelParent ? idMap.get(modelParent) : null;
    if (resolved && byTempId.get(resolved)?.kind === "bag") {
      c.parentTempId = resolved;
    } else {
      // No valid bag parent → promote to a bag so it stays usable.
      c.kind = "bag";
      c.parentTempId = null;
    }
  }

  const items: TemplateItem[] = [];
  let itemOrder = 0;
  for (const it of rawItems) {
    const name = String(it?.name ?? "").trim();
    if (!name) continue;
    const modelContainer =
      it?.containerTempId != null ? String(it.containerTempId) : null;
    let containerTempId = modelContainer ? idMap.get(modelContainer) ?? null : null;
    if (containerTempId && !byTempId.has(containerTempId)) containerTempId = null;
    items.push({
      name,
      containerTempId,
      categoryName:
        typeof it?.categoryName === "string" && it.categoryName.trim()
          ? it.categoryName.trim()
          : categorizeOffline(name),
      quantity: Math.max(1, Math.round(Number(it?.quantity) || 1)),
      sortOrder: itemOrder++,
    });
  }

  return { containers, items };
}
