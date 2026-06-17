// Server-only. Adapter for any provider that speaks the OpenAI-compatible
// /chat/completions protocol — Mistral, OpenAI, DeepSeek, and Ollama all do.
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
  });

  try {
    const completion = await client.chat.completions.create({
      model: cfg.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
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
