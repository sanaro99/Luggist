// Server-only. Shared error type so the dispatcher (chat.ts) and the adapters
// can both use it without a circular import.

/** Raised when the gateway can't fulfil a request; `status` maps to HTTP. */
export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}
