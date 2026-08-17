import { NextResponse } from "next/server";
import { GeminiError, generate, textOf } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `তুমি একজন বাংলাদেশি ছোট দোকানের মালিক। তোমার প্রতিবেশী এক ক্রেতাকে বাকি টাকার কথা মনে করিয়ে দিতে একটি ছোট বার্তা লিখো।

নিয়ম:
- খুব ছোট, দুই থেকে তিন বাক্যের বেশি নয়।
- বিনয়ী, আন্তরিক ও ঘরোয়া ভাষা — যেন পাশের বাড়ির মানুষকে বলছো।
- কখনো কড়া, দাবিদার বা অফিসিয়াল ভাষা নয়। কোনো হুমকি বা চাপ নয়।
- সালাম বা সম্বোধন দিয়ে শুরু করতে পারো।
- ক্রেতার নাম যেভাবে দেওয়া আছে সেভাবেই লিখবে।
- শুধু বার্তাটি লিখবে, কোনো ব্যাখ্যা বা উদ্ধৃতিচিহ্ন নয়।`;

export async function POST(request: Request) {
  try {
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

    const response = await generate(
      [
        {
          text: `ক্রেতার নাম: ${name}\nবাকি টাকা: ${amount} টাকা\nকত দিন ধরে বাকি: ${daysOverdue} দিন`,
        },
      ],
      {
        systemInstruction: SYSTEM,
        temperature: 0.9,
        thinkingConfig: { thinkingBudget: 0 },
      },
      "remind",
    );

    const text = textOf(response);
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty message." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Reminder failed: ${message}` }, { status: 500 });
  }
}
