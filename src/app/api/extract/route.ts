import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { GeminiError, generate, textOf } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const INSTRUCTION = `This is a photograph of a handwritten credit ledger from a small shop in Bangladesh. Entries may be in Bangla, English, or mixed, and handwriting may be messy. Extract every credit entry. For each row return the customer name, the item if written, the amount in Taka as a number, and the date in YYYY-MM-DD format if you can determine it. Set confidence between 0 and 1 reflecting how certain you are about the AMOUNT specifically — be conservative, a wrong amount is worse than an uncertain one. If a row is crossed out, skip it.`;

const SYSTEM = `You read handwritten Bangladeshi shop ledgers with extreme care.

Rules you must follow:
- Convert Bangla-Indic digits (০১২৩৪৫৬৭৮৯) to Western digits. ০=0 ১=1 ২=2 ৩=3 ৪=4 ৫=5 ৬=6 ৭=7 ৮=8 ৯=9.
- Amount must be a plain number: no commas, no currency symbol, no text.
- Digit pairs that are easy to confuse in Bangla handwriting: ১/৭, ২/৩, ৪/৮, ৫/৬, ৬/৯, ০/৭. When a digit could plausibly be either, keep your reading but lower confidence below 0.7.
- Confidence is about the AMOUNT only, never the name. A crisp name with a smudged amount is still low confidence.
- Use 0.9+ only when every digit of the amount is unambiguous. Use 0.5-0.7 when any digit is uncertain. Use below 0.5 when you are guessing.
- Skip any row with a line struck through it, and skip running totals, subtotals, column headers, and page numbers.
- Only output rows you can actually see. Never invent a plausible-looking entry.`;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Customer name as written" },
      item: { type: Type.STRING, description: "Item bought, empty string if not written" },
      amount: { type: Type.NUMBER, description: "Amount in Taka, Western digits" },
      date: { type: Type.STRING, description: "YYYY-MM-DD, empty string if undeterminable" },
      confidence: { type: Type.NUMBER, description: "0-1 certainty about the amount" },
    },
    required: ["name", "amount", "confidence"],
    propertyOrdering: ["name", "item", "amount", "date", "confidence"],
  },
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message, entries: [] }, { status });
}

const BN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const western = value.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
  const cleaned = western.replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const image: unknown = body?.image;
    if (typeof image !== "string" || image.length < 32) {
      return fail("No image received. Send { image: base64String }.", 400);
    }

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
    const mimeType = match?.[1] ?? "image/jpeg";
    const data = (match?.[2] ?? image).replace(/\s/g, "");

    if (data.length > 8_000_000) {
      return fail("That photo is too large. Try a slightly smaller image.", 413);
    }

    const response = await generate(
      [{ inlineData: { mimeType, data } }, { text: INSTRUCTION }],
      {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 2048 },
      },
      "extract",
    );

    const text = textOf(response);
    if (!text) return fail("Gemini returned an empty response. Try a clearer photo.", 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail("Could not read the ledger from that photo. Try again.", 502);
    }

    const rows = Array.isArray(parsed) ? parsed : [];
    const entries = rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => {
        const confidence = toNumber(row.confidence);
        return {
          name: typeof row.name === "string" ? row.name.trim() : "",
          item: typeof row.item === "string" ? row.item.trim() : "",
          amount: Math.abs(Math.round(toNumber(row.amount))),
          date: typeof row.date === "string" ? row.date.trim() : "",
          confidence: Math.min(1, Math.max(0, confidence)),
        };
      })
      .filter((row) => row.name || row.amount > 0);

    if (entries.length === 0) {
      return fail("No entries found on that page. Check the light and try again.", 422);
    }

    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof GeminiError) return fail(error.message, error.status);
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail(`Extraction failed: ${message}`, 500);
  }
}
