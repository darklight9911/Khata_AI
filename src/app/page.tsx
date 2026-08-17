"use client";

import { useCallback, useEffect, useState } from "react";
import Capture from "@/components/Capture";
import Dashboard from "@/components/Dashboard";
import Review from "@/components/Review";
import { STORAGE_KEY, normalize } from "@/lib/ledger";
import type { ExtractedEntry, LedgerEntry } from "@/lib/types";

type View = "capture" | "review" | "dashboard";

export default function Home() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [draft, setDraft] = useState<LedgerEntry[]>([]);
  const [view, setView] = useState<View>("capture");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setLedger(parsed);
          setView("dashboard");
        }
      }
    } catch {
      // corrupt storage — start fresh
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
    } catch {
      // storage full or blocked — keep working in memory
    }
  }, [ledger, loaded]);

  const handleExtracted = useCallback((entries: ExtractedEntry[]) => {
    setDraft(entries.map(normalize));
    setView("review");
  }, []);

  const commit = useCallback(() => {
    setLedger((prev) => [...prev, ...draft]);
    setDraft([]);
    setView("dashboard");
  }, [draft]);

  if (!loaded) return <div className="min-h-dvh" />;

  if (view === "review") {
    return (
      <Review
        rows={draft}
        onChange={setDraft}
        onCommit={commit}
        onCancel={() => {
          setDraft([]);
          setView(ledger.length ? "dashboard" : "capture");
        }}
      />
    );
  }

  if (view === "dashboard") {
    return <Dashboard entries={ledger} onCapture={() => setView("capture")} />;
  }

  return (
    <Capture
      onExtracted={handleExtracted}
      onOpenLedger={() => setView("dashboard")}
      hasLedger={ledger.length > 0}
    />
  );
}
