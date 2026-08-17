"use client";

import { formatTakaBn, toBn } from "@/lib/ledger";

type View = "capture" | "review" | "dashboard";

type Props = {
  view: View;
  onNavigate: (view: View) => void;
  hasLedger: boolean;
  total: number;
  pendingCount: number;
};

export default function Navbar({
  view,
  onNavigate,
  hasLedger,
  total,
  pendingCount,
}: Props) {
  const reviewing = view === "review";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-5 py-2">
        <button
          type="button"
          onClick={() => hasLedger && !reviewing && onNavigate("dashboard")}
          disabled={reviewing || !hasLedger}
          className="-ml-1 flex min-h-[48px] items-center gap-2 rounded-xl px-1 text-left disabled:cursor-default"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[17px]"
          >
            📓
          </span>
          <span className="leading-none">
            <span className="block text-[17px] font-bold">খাতা AI</span>
            <span className="mt-0.5 block text-[11px] text-muted">Khata AI</span>
          </span>
        </button>

        {reviewing ? (
          <span className="rounded-full border border-warn-line bg-warn-soft px-3 py-1.5 text-[12.5px] font-medium text-warn">
            যাচাই চলছে
            <span className="ml-1.5 opacity-75">
              {toBn(pendingCount)}টি
            </span>
          </span>
        ) : (
          <nav className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              disabled={!hasLedger}
              aria-current={view === "dashboard" ? "page" : undefined}
              className={`min-h-[40px] rounded-full px-3.5 text-[14px] font-medium transition-colors ${
                view === "dashboard"
                  ? "bg-accent text-white"
                  : "text-muted active:bg-paper"
              } disabled:opacity-40`}
            >
              খাতা
            </button>
            <button
              type="button"
              onClick={() => onNavigate("capture")}
              aria-current={view === "capture" ? "page" : undefined}
              className={`min-h-[40px] rounded-full px-3.5 text-[14px] font-medium transition-colors ${
                view === "capture"
                  ? "bg-accent text-white"
                  : "text-muted active:bg-paper"
              }`}
            >
              নতুন
            </button>
          </nav>
        )}
      </div>

      {hasLedger && view === "dashboard" && (
        <div className="border-t border-line/60 bg-surface/50">
          <div className="mx-auto flex w-full max-w-[430px] items-center justify-between px-5 py-1.5">
            <span className="text-[12px] text-muted">
              সংরক্ষিত খাতা <span className="opacity-75">/ Saved ledger</span>
            </span>
            <span className="num text-[13px] font-semibold">
              ৳{formatTakaBn(total)}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
