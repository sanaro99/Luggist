// Server-only. The dispatcher the AI gateway calls: resolves config, routes to
// the right provider adapter, then extracts JSON from the reply (shared across
// adapters so local models that ignore json mode still work).
// NEVER import this from a client component.

import { resolveConfig, type AdapterId, type AiConfig } from "./providers";
import { AiError } from "./errors";
import {
  completeOpenAICompatible,
  type ChatArgs,
} from "./adapters/openai-compatible";

// Re-export so existing importers (the route) can keep `from "@/lib/ai/chat"`.
export { AiError } from "./errors";

/** An adapter turns a config + prompt into the raw text reply from a provider. */
type Adapter = (cfg: AiConfig, args: ChatArgs) => Promise<string>;

const ADAPTERS: Record<AdapterId, Adapter> = {
  "openai-compatible": completeOpenAICompatible,
};

/**
 * Calls the configured provider and returns parsed JSON from the model's reply.
 * Throws `AiError` (with an HTTP status) on any failure.
 */
export async function callChatJson<T = unknown>(
  args: ChatArgs,
): Promise<T> {
  const cfg = resolveConfig();
  if (cfg.needsApiKey && !cfg.apiKey) {
    throw new AiError(
      `AI is not configured. Set AI_API_KEY (provider: ${cfg.provider}) in .env.local.`,
      503,
    );
  }

  const adapter = ADAPTERS[cfg.adapter];
  if (!adapter) {
    throw new AiError(`No AI adapter registered for "${cfg.adapter}".`, 500);
  }

  const content = await adapter(cfg, args);

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
