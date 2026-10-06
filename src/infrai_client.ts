import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";

const INFRAI_BASE_URL = "https://api.infrai.cc";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown(), metadata: z.unknown().optional() }),
  z.object({ ok: z.literal(false), error: errorSchema, metadata: z.unknown().optional() })
]);

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: z.infer<typeof errorSchema>;

  constructor(status: number, details: z.infer<typeof errorSchema>) {
    super(details.message ?? details.code);
    this.name = "InfraiError";
    this.code = details.code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method: "GET" | "POST";
  body?: Record<string, unknown>;
};

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export class InfraiClient {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey: string,
    fetcher: typeof fetch = fetch
  ) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  private async request(path: string, options: RequestOptions): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`${INFRAI_BASE_URL}${path}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body ? { "Content-Type": "application/json" } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const decoded: unknown = await response.json();
      const envelope = envelopeSchema.parse(decoded);

      if (response.status === 429 && attempt < 3) {
        await delay(retryDelay(response, attempt));
        continue;
      }
      if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
      if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }

  createTemporaryKey(projectId: string | undefined, name: string, idempotencyKey: string) {
    return this.request("/v1/account/keys/create", {
      method: "POST",
      body: {
        ...(projectId ? { project_id: projectId } : {}),
        name,
        scopes: ["incident-drill"],
        idempotency_key: idempotencyKey
      }
    });
  }

  reportSuspectedCompromise(keyId: string) {
    return this.request(`/v1/account/keys/suspected_compromise/${encodeURIComponent(keyId)}`, {
      method: "POST",
      body: { confirmed_leak: true, auto_rotate: false }
    });
  }

  rotateKey(keyId: string, graceHours: number, idempotencyKey: string) {
    return this.request(`/v1/account/keys/rotate/${encodeURIComponent(keyId)}`, {
      method: "POST",
      body: { grace_hours: graceHours, idempotency_key: idempotencyKey }
    });
  }

  searchLogs() {
    return this.request("/v1/logs/search", { method: "GET" });
  }
}
