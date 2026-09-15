// Server-only. Adapter for any provider that speaks the OpenAI-compatible
// /chat/completions protocol — Gemini, Mistral, OpenAI, DeepSeek, and Ollama all do.
// Uses the official `openai` SDK with a per-provider base URL, so we get a
// typed, maintained client (retries, JSON mode) without hand-rolling HTTP.

import OpenAI from "openai";
import { AiError } from "../errors";
import type { AiConfig } from "../providers";

export interface ChatArgs {
  system: string;
  user: string;
}

/** Calls the provider and returns the raw text content of the model's reply. */
export async function completeOpenAICompatible(
  cfg: AiConfig,
  { system, user }: ChatArgs,
): Promise<string> {
  const client = new OpenAI({
    apiKey: cfg.apiKey || "ollama", // local Ollama needs a non-empty placeholder
    baseURL: cfg.baseUrl,
    // The SDK retries 429s by default. One additional retry gives providers
    // time to clear short request-per-second limits without retrying forever.
    maxRetries: 3,
  });

  try {
    const completion = await client.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Gemini 3 deprecates sampling parameters; the other providers still
      // use a lower temperature for predictable JSON-shaped responses.
      ...(cfg.provider === "gemini" ? {} : { temperature: 0.3 }),
      // Only ask for JSON mode where the provider supports it; local models that
      // ignore it are handled by the extraction fallback in chat.ts.
      ...(cfg.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new AiError("The AI returned an empty response.", 502);
    return content;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof OpenAI.APIError) {
      // Connection errors have no HTTP status → treat as "unreachable" (503).
      const status = err.status ?? 503;
      if (status === 429) {
        throw new AiError(rateLimitMessage(cfg.provider, err.headers), status);
      }
      const where = err.status ? ` (${err.status})` : "";
      throw new AiError(
        `AI provider error${where} from ${cfg.provider}: ${err.message}`.slice(
          0,
          400,
        ),
        status,
      );
    }
    throw new AiError(
      `Couldn't reach the AI provider (${cfg.provider}). ${(err as Error).message}`,
      503,
    );
  }
}

/** Turn a provider's rate-limit response into a safe, helpful UI message. */
function rateLimitMessage(provider: string, headers: Headers | undefined): string {
  const retryAfter = retryAfterSeconds(headers?.get("retry-after"));
  const wait = retryAfter
    ? ` Try again in about ${retryAfter} ${retryAfter === 1 ? "second" : "seconds"}.`
    : " Please wait a moment and try again.";
  const providerName =
    provider === "mistral"
      ? "Mistral"
      : provider === "gemini"
        ? "Gemini"
        : "The AI provider";
  return `${providerName} has reached its request or token limit.${wait} If this keeps happening, check the provider account's rate limits or available credits.`;
}

/** `Retry-After` may be an integer delay or an HTTP date. */
function retryAfterSeconds(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return undefined;
  const delay = Math.ceil((retryAt - Date.now()) / 1_000);
  return delay > 0 ? delay : undefined;
}
