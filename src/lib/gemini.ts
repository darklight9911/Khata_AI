import { GoogleGenAI } from "@google/genai";
import type {
  Content,
  GenerateContentConfig,
  GenerateContentResponse,
  Part,
} from "@google/genai";

export const MODEL = "gemini-2.5-flash";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 600;
const TIMEOUT_MS = 45_000;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

function statusOf(error: unknown): number {
  if (typeof error === "object" && error !== null) {
    const e = error as { status?: unknown; code?: unknown; message?: unknown };
    if (typeof e.status === "number") return e.status;
    if (typeof e.code === "number") return e.code;
    const message = typeof e.message === "string" ? e.message : "";
    const match = message.match(/\b(4\d{2}|5\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return 0;
}

function friendly(status: number, raw: string): string {
  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(raw))
    return "GEMINI_API_KEY is not valid. Check the key in .env.";
  if (status === 401 || status === 403)
    return "GEMINI_API_KEY was rejected. Check the key and that the Gemini API is enabled.";
  if (status === 429)
    return "Gemini rate limit reached. Wait a few seconds and try again.";
  if (status >= 500) return "Gemini is temporarily unavailable. Try again.";
  return raw.slice(0, 300) || "Gemini request failed.";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not configured on the server.", 500);
  return new GoogleGenAI({ apiKey });
}

export async function generate(
  parts: Part[],
  config: GenerateContentConfig,
  label: string,
): Promise<GenerateContentResponse> {
  const ai = getClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }] satisfies Content[],
        config: { ...config, abortSignal: controller.signal },
      });

      const candidate = response.candidates?.[0];
      const finish = candidate?.finishReason;
      if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT") {
        throw new GeminiError("Gemini blocked this content. Try a different photo.", 422);
      }
      if (finish === "MAX_TOKENS") {
        throw new GeminiError("The page had too many rows to read at once. Try half a page.", 413);
      }

      const usage = response.usageMetadata;
      console.log(
        `[gemini:${label}] ok attempt=${attempt} in=${usage?.promptTokenCount ?? "?"} out=${usage?.candidatesTokenCount ?? "?"} think=${usage?.thoughtsTokenCount ?? 0}`,
      );
      return response;
    } catch (error) {
      lastError = error;
      if (error instanceof GeminiError) throw error;

      const status = statusOf(error);
      const aborted = controller.signal.aborted;
      const retryable = aborted || status === 0 || RETRYABLE.has(status);

      console.warn(
        `[gemini:${label}] attempt=${attempt} status=${status}${aborted ? " timeout" : ""} retryable=${retryable}`,
      );

      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
    }
  }

  const status = statusOf(lastError);
  const raw = lastError instanceof Error ? lastError.message : String(lastError);
  throw new GeminiError(friendly(status, raw), status >= 400 && status < 600 ? status : 502);
}

export function textOf(response: GenerateContentResponse): string {
  const direct = response.text;
  if (direct?.trim()) return direct.trim();
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}
