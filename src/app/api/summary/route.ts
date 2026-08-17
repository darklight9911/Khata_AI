import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `তুমি একজন বাংলাদেশি দোকানদারের সহকারী। নিচের বাকির হিসাব দেখে ২-৩ বাক্যে স্বাভাবিক কথ্য বাংলায় একটি সারাংশ বলো, যেন কেউ মুখে বলছে।

নিয়ম:
- মোট কত টাকা বাকি, কতজনের কাছে বাকি, এবং কার বাকি সবচেয়ে পুরনো — এই তিনটি বিষয় বলবে।
- শুধু সাধারণ বাক্য। কোনো মার্কডাউন নয়, কোনো বুলেট পয়েন্ট নয়, কোনো শিরোনাম নয়।
- অঙ্ক দিয়ে কোনো সংখ্যা লিখবে না। সব সংখ্যা কথায় লিখবে, যেমন "বারো হাজার পাঁচশো টাকা", "সাতজন", "বিয়াল্লিশ দিন"।
- উত্তরে শুধু বাক্যগুলো থাকবে, আর কিছু নয়।`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => null);
    const raw = Array.isArray(body?.entries) ? body.entries : body;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: "Send an array of ledger entries." }, { status: 400 });
    }

    const today = new Date();
    const lines = raw.slice(0, 200).map((entry: Record<string, unknown>) => {
      const name = typeof entry?.name === "string" ? entry.name : "অজানা";
      const amount = Number(entry?.amount) || 0;
      const date = typeof entry?.date === "string" ? entry.date : "";
      const parsed = new Date(`${date}T00:00:00`);
      const days = Number.isNaN(parsed.getTime())
        ? 0
        : Math.max(0, Math.floor((today.getTime() - parsed.getTime()) / 86_400_000));
      return `${name} — ${amount} টাকা — ${days} দিন আগের`;
    });

    const total = raw.reduce(
      (sum: number, entry: Record<string, unknown>) => sum + (Number(entry?.amount) || 0),
      0,
    );
    const debtors = new Set(
      raw.map((entry: Record<string, unknown>) =>
        String(entry?.name ?? "").trim().toLowerCase(),
      ),
    ).size;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM}\n\nমোট বাকি: ${total} টাকা\nমোট খাতক: ${debtors} জন\n\nএন্ট্রি:\n${lines.join("\n")}`,
            },
          ],
        },
      ],
      config: { temperature: 0.6 },
    });

    const text = response.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty summary." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Summary failed: ${message}` }, { status: 500 });
  }
}
