import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `তুমি একজন বাংলাদেশি ছোট দোকানের মালিক। তোমার প্রতিবেশী এক ক্রেতাকে বাকি টাকার কথা মনে করিয়ে দিতে একটি ছোট বার্তা লিখো।

নিয়ম:
- খুব ছোট, দুই থেকে তিন বাক্যের বেশি নয়।
- বিনয়ী, আন্তরিক ও ঘরোয়া ভাষা — যেন পাশের বাড়ির মানুষকে বলছো।
- কখনো কড়া, দাবিদার বা অফিসিয়াল ভাষা নয়। কোনো হুমকি বা চাপ নয়।
- সালাম বা সম্বোধন দিয়ে শুরু করতে পারো।
- শুধু বার্তাটি লিখবে, কোনো ব্যাখ্যা বা উদ্ধৃতিচিহ্ন নয়।`;

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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const amount = Number(body?.amount) || 0;
    const daysOverdue = Number(body?.daysOverdue) || 0;

    if (!name || amount <= 0) {
      return NextResponse.json(
        { error: "Send { name, amount, daysOverdue }." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM}\n\nক্রেতার নাম: ${name}\nবাকি টাকা: ${amount} টাকা\nকত দিন ধরে বাকি: ${daysOverdue} দিন`,
            },
          ],
        },
      ],
      config: { temperature: 0.8 },
    });

    const text = response.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty message." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Reminder failed: ${message}` }, { status: 500 });
  }
}
