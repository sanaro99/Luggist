// Server-only. Provider registry + env-driven config for the AI gateway.
// NEVER import this from a client component — it reads secret env vars.
//
// All four providers expose an OpenAI-compatible `/chat/completions` endpoint,
// so a single client (configurable base URL + model + key) covers them. Add a
// new provider by extending PROVIDERS — nothing else needs to change.

export type ProviderId = "mistral" | "openai" | "deepseek" | "ollama";

interface ProviderDef {
  baseUrl: string;
  defaultModel: string;
  /** Whether the provider honors OpenAI-style `response_format: json_object`. */
  jsonMode: boolean;
  /** Local providers (Ollama) don't need an API key. */
  needsApiKey: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    jsonMode: true,
    needsApiKey: true,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    jsonMode: true,
    needsApiKey: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    jsonMode: true,
    needsApiKey: true,
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    jsonMode: false,
    needsApiKey: false,
  },
};

export interface AiConfig {
  provider: ProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  jsonMode: boolean;
  needsApiKey: boolean;
}

function isProviderId(v: string | undefined): v is ProviderId {
  return v === "mistral" || v === "openai" || v === "deepseek" || v === "ollama";
}

/** Reads the AI_* env vars, falling back to the provider's defaults. */
export function resolveConfig(): AiConfig {
  const envProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const provider: ProviderId = isProviderId(envProvider) ? envProvider : "mistral";
  const def = PROVIDERS[provider];
  return {
    provider,
    baseUrl: process.env.AI_BASE_URL?.trim() || def.baseUrl,
    model: process.env.AI_MODEL?.trim() || def.defaultModel,
    apiKey: process.env.AI_API_KEY?.trim() || "",
    jsonMode: def.jsonMode,
    needsApiKey: def.needsApiKey,
  };
}
