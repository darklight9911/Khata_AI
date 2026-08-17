import { NextResponse } from "next/server";

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const PRIMARY_MODEL = "eleven_v3";
const FALLBACK_MODEL = "eleven_multilingual_v2";

export const runtime = "nodejs";
export const maxDuration = 60;

async function synthesize(text: string, apiKey: string, modelId: string) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, model_id: modelId }),
  });
}

export async function POST(request: Request) {
  try {
    const apiKey =
      process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => null);
    const text: unknown = body?.text;
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Send { text: string }." }, { status: 400 });
    }

    let response = await synthesize(text, apiKey, PRIMARY_MODEL);
    if (!response.ok) {
      response = await synthesize(text, apiKey, FALLBACK_MODEL);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs failed (${response.status}). ${detail.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Speech failed: ${message}` }, { status: 500 });
  }
}
