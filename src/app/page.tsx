"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Capture from "@/components/Capture";
import Dashboard from "@/components/Dashboard";
import Navbar from "@/components/Navbar";
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

  const total = useMemo(
    () => ledger.reduce((sum, e) => sum + e.amount, 0),
    [ledger],
  );

  const handleExtracted = useCallback((entries: ExtractedEntry[]) => {
    setDraft(entries.map(normalize));
    setView("review");
  }, []);

  const commit = useCallback(() => {
    setLedger((prev) => [...prev, ...draft]);
    setDraft([]);
    setView("dashboard");
  }, [draft]);

  const navigate = useCallback(
    (next: View) => {
      if (next === "dashboard" && !ledger.length) return;
      setView(next);
    },
    [ledger.length],
  );

  if (!loaded) return <div className="min-h-dvh" />;

  return (
    <>
      <Navbar
        view={view}
        onNavigate={navigate}
        hasLedger={ledger.length > 0}
        total={total}
        pendingCount={draft.length}
      />

      {view === "review" && (
        <Review
          rows={draft}
          onChange={setDraft}
          onCommit={commit}
          onCancel={() => {
            setDraft([]);
            setView(ledger.length ? "dashboard" : "capture");
          }}
        />
      )}

      {view === "dashboard" && (
        <Dashboard entries={ledger} onCapture={() => setView("capture")} />
      )}

      {view === "capture" && (
        <Capture
          onExtracted={handleExtracted}
          onOpenLedger={() => setView("dashboard")}
          hasLedger={ledger.length > 0}
        />
      )}
    </>
  );
}
