// Server-only. The single OpenAI-compatible chat call used by the AI gateway,
// plus a robust JSON extraction so local models that ignore json mode still work.
// NEVER import this from a client component.

import { resolveConfig } from "./providers";

/** Raised when the gateway can't fulfil a request; `status` maps to HTTP. */
export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

interface ChatArgs {
  system: string;
  user: string;
}

/**
 * Calls the configured `/chat/completions` endpoint and returns the parsed JSON
 * from the model's reply. Throws `AiError` (with an HTTP status) on any failure.
 */
export async function callChatJson<T = unknown>({
  system,
  user,
}: ChatArgs): Promise<T> {
  const cfg = resolveConfig();
  if (cfg.needsApiKey && !cfg.apiKey) {
    throw new AiError(
      `AI is not configured. Set AI_API_KEY (provider: ${cfg.provider}) in .env.local.`,
      503,
    );
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  const body: Record<string, unknown> = {
    model: cfg.model,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (cfg.jsonMode) body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new AiError(
      `Couldn't reach the AI provider (${cfg.provider}). ${(err as Error).message}`,
      503,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AiError(
      `AI provider returned ${res.status}. ${detail.slice(0, 300)}`.trim(),
      502,
    );
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new AiError("The AI returned an empty response.", 502);

  const parsed = extractJson<T>(content);
  if (parsed === undefined) {
    throw new AiError("The AI returned a response that wasn't valid JSON.", 502);
  }
  return parsed;
}

/** Best-effort JSON: direct parse → strip ``` fences → first balanced slice. */
function extractJson<T>(text: string): T | undefined {
  const tryParse = (s: string): T | undefined => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return undefined;
    }
  };

  const trimmed = text.trim();
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const fenced = tryParse(fence[1].trim());
    if (fenced !== undefined) return fenced;
  }

  const start = trimmed.search(/[{[]/);
  if (start >= 0) {
    const close = trimmed[start] === "{" ? "}" : "]";
    const end = trimmed.lastIndexOf(close);
    if (end > start) {
      const sliced = tryParse(trimmed.slice(start, end + 1));
      if (sliced !== undefined) return sliced;
    }
  }
  return undefined;
}
