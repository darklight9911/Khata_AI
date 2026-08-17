import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const INSTRUCTION = `This is a photograph of a handwritten credit ledger from a small shop in Bangladesh. Entries may be in Bangla, English, or mixed, and handwriting may be messy. Extract every credit entry. For each row return the customer name, the item if written, the amount in Taka as a number, and the date in YYYY-MM-DD format if you can determine it. Set confidence between 0 and 1 reflecting how certain you are about the AMOUNT specifically — be conservative, a wrong amount is worse than an uncertain one. If a row is crossed out, skip it.`;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      item: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      date: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
    },
    required: ["name", "amount", "confidence"],
  },
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message, entries: [] }, { status });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return fail("GEMINI_API_KEY is not configured on the server.", 500);

    const body = await request.json().catch(() => null);
    const image: unknown = body?.image;
    if (typeof image !== "string" || image.length < 32) {
      return fail("No image received. Send { image: base64String }.", 400);
    }

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
    const mimeType = match?.[1] ?? "image/jpeg";
    const data = (match?.[2] ?? image).replace(/\s/g, "");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType, data } }, { text: INSTRUCTION }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
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
      .map((row) => ({
        name: typeof row.name === "string" ? row.name : "",
        item: typeof row.item === "string" ? row.item : "",
        amount: typeof row.amount === "number" ? row.amount : Number(row.amount) || 0,
        date: typeof row.date === "string" ? row.date : "",
        confidence:
          typeof row.confidence === "number" ? row.confidence : Number(row.confidence) || 0,
      }))
      .filter((row) => row.name || row.amount);

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return fail(`Extraction failed: ${message}`, 500);
  }
}
