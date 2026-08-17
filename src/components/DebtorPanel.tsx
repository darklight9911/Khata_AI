"use client";

import { useState } from "react";
import { formatDate, formatTaka } from "@/lib/ledger";
import type { Debtor } from "@/lib/types";

type Props = {
  debtor: Debtor;
  onClose: () => void;
  onPlay: (text: string) => Promise<void>;
  audioState: "idle" | "loading" | "playing";
};

export default function DebtorPanel({ debtor, onClose, onPlay, audioState }: Props) {
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: debtor.name,
          amount: debtor.total,
          daysOverdue: debtor.daysOverdue,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error || "বার্তা তৈরি করা গেল না।");
      else setMessage(data.text);
    } catch {
      setError("সংযোগে সমস্যা হয়েছে।");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="বন্ধ করুন"
        onClick={onClose}
        className="absolute inset-0 bg-ink/35"
      />

      <div className="sheet relative max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-paper">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-8 pt-3">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line" />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-[24px] font-bold">{debtor.name}</h2>
              <p className="mt-0.5 text-[14px] text-muted">
                {debtor.daysOverdue} দিন ধরে বাকি
                <span className="ml-1.5 text-[12.5px] opacity-80">
                  {debtor.daysOverdue} days overdue
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[19px] text-muted active:bg-surface"
            >
              ✕
            </button>
          </div>

          <p className="num mt-4 text-[44px] font-bold leading-none">
            ৳{formatTaka(debtor.total)}
          </p>

          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {debtor.entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">
                    {entry.item || "বাকি"}
                  </span>
                  <span className="num block text-[13px] text-muted">
                    {formatDate(entry.date)}
                  </span>
                </span>
                <span className="num shrink-0 text-[19px] font-semibold">
                  ৳{formatTaka(entry.amount)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            {!message && (
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="min-h-[56px] w-full rounded-2xl border-2 border-accent bg-surface px-5 text-[17px] font-semibold text-accent transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {generating ? "লেখা হচ্ছে…" : "তাগাদার বার্তা লিখুন"}
                <span className="mt-0.5 block text-[12.5px] font-normal text-muted">
                  {generating ? "Writing…" : "Generate reminder"}
                </span>
              </button>
            )}

            {error && (
              <p className="mt-3 rounded-xl border-l-4 border-warn-line bg-warn-soft px-4 py-3 text-[14px] text-warn">
                {error}
              </p>
            )}

            {message && (
              <div>
                <label className="mb-2 block text-[14px] font-medium">
                  বার্তা <span className="text-[12.5px] font-normal text-muted">/ Message</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-line bg-surface p-4 text-[16px] leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onPlay(message)}
                    disabled={audioState !== "idle" || !message.trim()}
                    className="min-h-[52px] rounded-xl border border-line bg-surface text-[16px] font-medium disabled:opacity-50"
                  >
                    {audioState === "loading"
                      ? "…"
                      : audioState === "playing"
                        ? "▮▮ বাজছে"
                        : "▶ শুনুন"}
                  </button>
                  <button
                    type="button"
                    onClick={copy}
                    className="min-h-[52px] rounded-xl bg-accent text-[16px] font-semibold text-white active:scale-[0.98]"
                  >
                    {copied ? "কপি হয়েছে ✓" : "কপি করুন"}
                  </button>
                </div>

                <p className="mt-3 text-center text-[12.5px] text-muted">
                  কপি করে নিজে পাঠান — অ্যাপ নিজে থেকে কিছু পাঠায় না
                  <span className="mt-0.5 block opacity-80">
                    Nothing is sent automatically — you send it yourself
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
