"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtractedEntry } from "@/lib/types";

const STEPS = [
  { bn: "ছবি পাঠানো হচ্ছে", en: "Uploading photo" },
  { bn: "হাতের লেখা পড়া হচ্ছে", en: "Reading handwriting" },
  { bn: "নাম ও টাকা আলাদা করা হচ্ছে", en: "Separating names and amounts" },
  { bn: "হিসাব সাজানো হচ্ছে", en: "Organising entries" },
];

type Props = {
  onExtracted: (entries: ExtractedEntry[], preview: string) => void;
};

export default function Capture({ onExtracted }: Props) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const timers = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 2600),
      setTimeout(() => setStep(3), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!base64) {
      setError("ছবিটি পড়া গেল না। আবার চেষ্টা করুন।");
      return;
    }

    setPreview(base64);
    setStep(0);
    setBusy(true);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "কিছু একটা সমস্যা হয়েছে।");
        setBusy(false);
        return;
      }
      if (!data.entries?.length) {
        setError("এই ছবিতে কোনো এন্ট্রি পাওয়া যায়নি। আলো ঠিক আছে কি না দেখে আবার তুলুন।");
        setBusy(false);
        return;
      }

      onExtracted(data.entries as ExtractedEntry[], base64);
    } catch {
      setError("সংযোগে সমস্যা। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col px-5 pb-10 pt-8">
        <div className="mx-auto w-full max-w-[430px]">
          {preview && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="h-40 w-full object-cover opacity-55"
              />
            </div>
          )}

          <h1 className="text-2xl font-semibold">খাতা পড়া হচ্ছে</h1>
          <p className="mt-1 text-[15px] text-muted">Reading your khata</p>

          <ol className="mt-10 space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={s.en}
                  className={`flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
                    active ? "bg-accent-soft" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${
                      done
                        ? "border-accent bg-accent text-white"
                        : active
                          ? "border-accent text-accent"
                          : "border-line text-muted"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={active ? "pulse" : done ? "" : "opacity-45"}>
                    <span
                      className={`block text-[17px] ${
                        active || done ? "font-medium text-ink" : "text-muted"
                      }`}
                    >
                      {s.bn}
                    </span>
                    <span className="block text-[13px] text-muted">{s.en}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col px-5 pb-10 pt-8">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
        <header className="rise">
          <h1 className="text-[30px] font-bold leading-tight">
            বাকির খাতার ছবি তুলুন
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            হিসাব নিজে থেকেই তৈরি হয়ে যাবে
          </p>
          <p className="text-[13px] text-muted/80">
            Photograph your credit ledger, get your receivables
          </p>
        </header>

        <div className="mt-10 flex flex-1 flex-col justify-center">
          <div className="mb-10 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl">
              📓
            </div>
            <p className="text-[17px] font-medium">খাতার পাতা খুলে ছবি তুলুন</p>
            <p className="mt-1 text-[14px] text-muted">
              পুরো পাতা ফ্রেমে রাখুন, আলো যেন যথেষ্ট থাকে
            </p>
            <p className="mt-1 text-[12.5px] text-muted/80">
              Fit the whole page in frame, in good light
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border-l-4 border-warn-line bg-warn-soft px-4 py-3 text-[15px] text-warn">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-[64px] w-full rounded-2xl bg-accent px-6 text-[19px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            খাতার ছবি তুলুন
            <span className="mt-0.5 block text-[13px] font-normal text-white/75">
              Photograph the khata
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
