// AI gateway. One route, one switch over tasks — keep it minimal.
// Provider + credentials come from env vars (see .env.local); this handler is
// the only place secret keys are read. Runs on the Node runtime.

import { callChatJson, AiError } from "@/lib/ai/chat";

export const runtime = "nodejs";

const CATEGORIES = [
  "Clothes",
  "Electronics",
  "Toiletries",
  "Documents",
  "Health",
  "Misc",
];
const CATEGORY_HINT =
  `Prefer these category names when one fits: ${CATEGORIES.join(", ")}. ` +
  `Use a short new name only if none of them fit.`;

interface Body {
  task?: string;
  payload?: unknown;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = (body.payload ?? {}) as Record<string, unknown>;
  try {
    switch (body.task) {
      case "generateList":
        return Response.json(await generateList(payload));
      case "audit":
        return Response.json(await audit(payload));
      case "parseQuickAdd":
        return Response.json(await parseQuickAdd(payload));
      case "categorize":
        return Response.json(await categorize(payload));
      default:
        return Response.json(
          { error: `Unknown AI task: ${String(body.task)}` },
          { status: 400 },
        );
    }
  } catch (err) {
    if (err instanceof AiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json(
      { error: (err as Error).message || "AI request failed." },
      { status: 500 },
    );
  }
}

/* ------------------------------- Tasks -------------------------------- */

function generateList(p: Record<string, unknown>) {
  const facts = [
    p.destination ? `Destination: ${String(p.destination)}.` : "",
    p.durationDays ? `Duration: ${Number(p.durationDays)} days.` : "",
    p.notes ? `Trip notes: ${String(p.notes)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const system =
    "You are a travel packing assistant. Build a practical, well-organized packing list. " +
    "Respond ONLY with a JSON object of this exact shape:\n" +
    '{ "containers": [{ "tempId": string, "parentTempId": string|null, "kind": "bag"|"cube", "name": string, "sortOrder": number }], ' +
    '"items": [{ "name": string, "containerTempId": string|null, "categoryName": string|null, "quantity": number, "sortOrder": number }] }.\n' +
    "Use 1-3 bags (kind 'bag', parentTempId null). You may group items into packing cubes (kind 'cube', parentTempId = a bag's tempId). " +
    "Each item's containerTempId must reference a container tempId you defined. Use realistic quantities. " +
    CATEGORY_HINT;
  const user = `${facts || "A general trip."} Generate the packing list now.`;

  return callChatJson<{ containers: unknown; items: unknown }>({ system, user });
}

function audit(p: Record<string, unknown>) {
  const existing = Array.isArray(p.existingNames)
    ? (p.existingNames as unknown[]).map(String).join(", ")
    : "";
  const system =
    "You are a travel packing assistant. Given a trip and the items already on the list, " +
    "suggest commonly-forgotten or essential items that are MISSING from it. " +
    'Respond ONLY with JSON: { "suggestions": [{ "name": string, "categoryName": string|null }] }. ' +
    "Return 5-10 concise suggestions. Do NOT repeat any item already on the list. " +
    CATEGORY_HINT;
  const user = [
    p.destination ? `Destination: ${String(p.destination)}.` : "",
    p.season ? `Season: ${String(p.season)}.` : "",
    `Already on the list: ${existing || "(nothing yet)"}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return callChatJson<{ suggestions: unknown }>({ system, user });
}

function parseQuickAdd(p: Record<string, unknown>) {
  const text = String(p.text ?? "").slice(0, 600);
  const system =
    "Parse the user's free text into discrete packing items. " +
    'Respond ONLY with JSON: { "items": [{ "name": string, "quantity": number, "categoryName": string|null }] }. ' +
    "Split on commas, 'and', and '+'. Pull leading numbers into quantity (default 1). " +
    "Keep names short and clean (e.g. 'shirt', not '3 shirts'). " +
    CATEGORY_HINT;
  const user = `Text: ${text}`;

  return callChatJson<{ items: unknown }>({ system, user });
}

function categorize(p: Record<string, unknown>) {
  const names = Array.isArray(p.names)
    ? (p.names as unknown[]).map(String).slice(0, 60)
    : [];
  const system =
    "Assign each packing item to its best category. " +
    'Respond ONLY with JSON: { "assignments": [{ "name": string, "categoryName": string }] }. ' +
    CATEGORY_HINT;
  const user = `Items: ${names.join(", ")}`;

  return callChatJson<{ assignments: unknown }>({ system, user });
}
