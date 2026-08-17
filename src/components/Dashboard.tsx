"use client";

import { useMemo, useState } from "react";
import {
  agingSummary,
  bucketOf,
  daysSince,
  formatTaka,
  groupByDebtor,
} from "@/lib/ledger";
import type { AgingBucket, Debtor, LedgerEntry } from "@/lib/types";
import DebtorPanel from "./DebtorPanel";

const BUCKETS: { key: AgingBucket; bn: string; en: string }[] = [
  { key: "0-30", bn: "০–৩০ দিন", en: "0-30 days" },
  { key: "31-60", bn: "৩১–৬০ দিন", en: "31-60 days" },
  { key: "60+", bn: "৬০+ দিন", en: "60+ days" },
];

type AudioState = "idle" | "loading" | "playing";

type Props = {
  entries: LedgerEntry[];
  onCapture: () => void;
};

export default function Dashboard({ entries, onCapture }: Props) {
  const [filter, setFilter] = useState<AgingBucket | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [summaryState, setSummaryState] = useState<AudioState>("idle");
  const [summaryText, setSummaryText] = useState("");
  const [error, setError] = useState("");

  const total = useMemo(
    () => entries.reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );
  const aging = useMemo(() => agingSummary(entries), [entries]);
  const allDebtors = useMemo(() => groupByDebtor(entries), [entries]);

  const debtors = useMemo(() => {
    if (!filter) return allDebtors;
    const scoped = entries.filter((e) => bucketOf(daysSince(e.date)) === filter);
    return groupByDebtor(scoped);
  }, [allDebtors, entries, filter]);

  const openDebtor: Debtor | null = useMemo(() => {
    if (!selected) return null;
    return allDebtors.find((d) => d.name === selected) ?? null;
  }, [allDebtors, selected]);

  async function play(text: string, setState: (s: AudioState) => void) {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "শব্দ তৈরি করা গেল না।");
        setState("idle");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setState("playing");
      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setError("শোনানো গেল না। আবার চেষ্টা করুন।");
      setState("idle");
    }
  }

  async function listenToKhata() {
    if (summaryState !== "idle") return;
    setSummaryState("loading");
    setError("");
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "সারাংশ তৈরি করা গেল না।");
        setSummaryState("idle");
        return;
      }
      setSummaryText(data.text);
      await play(data.text, setSummaryState);
    } catch {
      setError("সংযোগে সমস্যা হয়েছে।");
      setSummaryState("idle");
    }
  }

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto w-full max-w-[430px] px-5 pt-12">
        <div className="flex items-start justify-between">
          <h1 className="text-[15px] font-medium text-muted">
            মোট বাকি
            <span className="mt-0.5 block text-[12.5px] opacity-80">
              Total outstanding
            </span>
          </h1>
          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-muted">
            {allDebtors.length} জন খাতক
          </span>
        </div>

        <p className="num mt-2 text-[64px] font-bold leading-[1.05] tracking-tight">
          ৳{formatTaka(total)}
        </p>

        <button
          type="button"
          onClick={listenToKhata}
          disabled={summaryState !== "idle"}
          className="mt-7 min-h-[62px] w-full rounded-2xl bg-accent px-5 text-[18px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {summaryState === "loading" && "হিসাব তৈরি হচ্ছে…"}
          {summaryState === "playing" && "▮▮ শোনানো হচ্ছে"}
          {summaryState === "idle" && "🔊 খাতা শুনুন"}
          <span className="mt-0.5 block text-[12.5px] font-normal text-white/75">
            {summaryState === "loading"
              ? "Preparing…"
              : summaryState === "playing"
                ? "Playing…"
                : "Listen to my khata"}
          </span>
        </button>

        {summaryText && summaryState === "idle" && (
          <p className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-muted">
            {summaryText}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl border-l-4 border-warn-line bg-warn-soft px-4 py-3 text-[14px] text-warn">
            {error}
          </p>
        )}

        <div className="mt-8 flex gap-2.5 overflow-x-auto pb-1">
          {BUCKETS.map((b) => {
            const stat = aging[b.key];
            const active = filter === b.key;
            const empty = stat.count === 0;
            return (
              <button
                key={b.key}
                type="button"
                disabled={empty}
                onClick={() => setFilter(active ? null : b.key)}
                className={`min-h-[76px] flex-1 shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface"
                } ${empty ? "opacity-40" : ""}`}
              >
                <span className="block whitespace-nowrap text-[12.5px] text-muted">
                  {b.bn}
                </span>
                <span className="num mt-1 block text-[19px] font-bold leading-tight">
                  ৳{formatTaka(stat.amount)}
                </span>
                <span className="block text-[12px] text-muted">
                  {stat.count} টি
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">
            যারা বাকি রেখেছে
            <span className="ml-2 text-[12.5px] font-normal text-muted">
              Debtors
            </span>
          </h2>
          {filter && (
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="min-h-[44px] text-[14px] font-medium text-accent"
            >
              ফিল্টার সরান
            </button>
          )}
        </div>

        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {debtors.map((d) => (
            <li key={d.name}>
              <button
                type="button"
                onClick={() => setSelected(d.name)}
                className="flex min-h-[72px] w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-paper"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[17px] font-medium">
                    {d.name}
                  </span>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${
                      d.daysOverdue > 60
                        ? "bg-warn-soft text-warn"
                        : "bg-paper text-muted"
                    }`}
                  >
                    {d.daysOverdue} দিন
                  </span>
                </span>
                <span className="num shrink-0 text-[24px] font-bold">
                  ৳{formatTaka(d.total)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {debtors.length === 0 && (
          <p className="mt-8 text-center text-[15px] text-muted">
            এই সময়ের কোনো বাকি নেই
            <span className="mt-1 block text-[13px]">Nothing in this range</span>
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-5 pb-6 pt-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[430px]">
          <button
            type="button"
            onClick={onCapture}
            className="min-h-[56px] w-full rounded-2xl border border-line bg-surface text-[17px] font-semibold text-ink active:scale-[0.98]"
          >
            + নতুন পাতা যোগ করুন
            <span className="ml-2 text-[12.5px] font-normal text-muted">
              Add another page
            </span>
          </button>
        </div>
      </div>

      {openDebtor && (
        <DebtorPanel
          debtor={openDebtor}
          onClose={() => setSelected(null)}
          onPlay={(text) => play(text, setAudioState)}
          audioState={audioState}
        />
      )}
    </div>
  );
}
