"use client";

import { useMemo } from "react";
import { CONFIDENCE_THRESHOLD, formatTaka } from "@/lib/ledger";
import type { LedgerEntry } from "@/lib/types";

const NAME_PLACEHOLDERS = ["Karim Mia", "Rahima Begum", "Jashim Uddin"];

type Props = {
  rows: LedgerEntry[];
  onChange: (rows: LedgerEntry[]) => void;
  onCommit: () => void;
  onCancel: () => void;
};

function WarnIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path
        d="M10 2.6 18.4 17H1.6L10 2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.6v3.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14.2" r="1" fill="currentColor" />
    </svg>
  );
}

export default function Review({ rows, onChange, onCommit, onCancel }: Props) {
  const uncertain = useMemo(
    () => rows.filter((r) => r.confidence < CONFIDENCE_THRESHOLD).length,
    [rows],
  );
  const total = useMemo(() => rows.reduce((sum, r) => sum + r.amount, 0), [rows]);

  function update(id: string, patch: Partial<LedgerEntry>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function remove(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  const fieldBase =
    "w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

  return (
    <div className="min-h-dvh pb-32">
      <div className="mx-auto w-full max-w-[430px] px-5 pt-12">
        <header>
          <button
            type="button"
            onClick={onCancel}
            className="-ml-2 mb-4 min-h-[44px] px-2 text-[15px] text-muted"
          >
            ← বাতিল <span className="text-[13px]">/ Cancel</span>
          </button>

          <h1 className="text-[28px] font-bold leading-tight">যাচাই করুন</h1>
          <p className="mt-1 text-[15px] text-muted">
            Check what the AI read before saving
          </p>

          <div className="mt-5 rounded-xl border-l-4 border-warn-line bg-warn-soft px-4 py-3">
            {uncertain > 0 ? (
              <p className="flex items-start gap-2 text-[15px] font-medium text-warn">
                <span className="mt-0.5">
                  <WarnIcon />
                </span>
                <span>
                  {uncertain} টি সারির টাকার অঙ্ক নিয়ে সন্দেহ আছে — মিলিয়ে নিন
                  <span className="mt-0.5 block text-[13px] font-normal">
                    {uncertain} row{uncertain > 1 ? "s" : ""} need your check
                  </span>
                </span>
              </p>
            ) : (
              <p className="text-[15px] font-medium text-warn">
                সব অঙ্ক পরিষ্কারভাবে পড়া গেছে
                <span className="mt-0.5 block text-[13px] font-normal">
                  All amounts read clearly — still worth a glance
                </span>
              </p>
            )}
          </div>
        </header>

        <ul className="mt-6 space-y-3">
          {rows.map((row, index) => {
            const low = row.confidence < CONFIDENCE_THRESHOLD;
            return (
              <li
                key={row.id}
                className={`rounded-xl border bg-surface p-4 ${
                  low
                    ? "border-l-4 border-line border-l-warn-line bg-warn-soft"
                    : "border-line"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
                    {low && (
                      <span className="text-warn">
                        <WarnIcon />
                      </span>
                    )}
                    {low ? (
                      <span className="text-warn">
                        অনিশ্চিত · {Math.round(row.confidence * 100)}%
                      </span>
                    ) : (
                      <span>সারি {index + 1}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    aria-label="সারি মুছুন"
                    className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-[19px] text-muted active:bg-paper"
                  >
                    ✕
                  </button>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[13px] text-muted">
                    নাম <span className="opacity-70">/ Name</span>
                  </span>
                  <input
                    value={row.name}
                    onChange={(e) => update(row.id, { name: e.target.value })}
                    placeholder={NAME_PLACEHOLDERS[index % NAME_PLACEHOLDERS.length]}
                    className={`${fieldBase} min-h-[48px] font-medium`}
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-[13px] text-muted">
                    টাকা <span className="opacity-70">/ Amount</span>
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[22px] font-semibold text-muted">
                      ৳
                    </span>
                    <input
                      inputMode="numeric"
                      value={row.amount === 0 ? "" : String(row.amount)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^\d]/g, "");
                        update(row.id, { amount: digits ? parseInt(digits, 10) : 0 });
                      }}
                      placeholder="0"
                      className={`${fieldBase} num min-h-[60px] pl-9 text-[28px] font-bold ${
                        low ? "border-warn-line" : ""
                      }`}
                    />
                  </div>
                </label>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] text-muted">
                      পণ্য <span className="opacity-70">/ Item</span>
                    </span>
                    <input
                      value={row.item}
                      onChange={(e) => update(row.id, { item: e.target.value })}
                      placeholder="চাল, তেল…"
                      className={`${fieldBase} min-h-[48px]`}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] text-muted">
                      তারিখ <span className="opacity-70">/ Date</span>
                    </span>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => update(row.id, { date: e.target.value })}
                      className={`${fieldBase} num min-h-[48px]`}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>

        {rows.length === 0 && (
          <p className="mt-10 text-center text-[15px] text-muted">
            সব সারি মুছে ফেলা হয়েছে
            <span className="mt-1 block text-[13px]">No rows left</span>
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-6 pt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[15px] text-muted">
              {rows.length} টি সারি <span className="text-[13px]">/ rows</span>
            </span>
            <span className="num text-[26px] font-bold">৳{formatTaka(total)}</span>
          </div>
          <button
            type="button"
            onClick={onCommit}
            disabled={rows.length === 0}
            className="min-h-[60px] w-full rounded-2xl bg-accent px-6 text-[19px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            খাতায় যোগ করুন
            <span className="mt-0.5 block text-[13px] font-normal text-white/75">
              Add to ledger
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
