import type { AgingBucket, Debtor, ExtractedEntry, LedgerEntry } from "./types";

export const STORAGE_KEY = "khata-ledger";
export const CONFIDENCE_THRESHOLD = 0.8;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalize(entry: ExtractedEntry): LedgerEntry {
  const date =
    entry.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : todayISO();
  return {
    id: makeId(),
    name: (entry.name || "").trim() || "অজানা",
    item: (entry.item || "").trim(),
    amount: Number.isFinite(entry.amount) ? Math.round(entry.amount) : 0,
    date,
    confidence:
      typeof entry.confidence === "number"
        ? Math.min(1, Math.max(0, entry.confidence))
        : 0,
  };
}

export function daysSince(date: string): number {
  const then = new Date(`${date}T00:00:00`);
  if (Number.isNaN(then.getTime())) return 0;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((start.getTime() - then.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

export function bucketOf(days: number): AgingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export function formatTaka(amount: number): string {
  return Math.round(amount).toLocaleString("en-IN");
}

export function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function groupByDebtor(entries: LedgerEntry[]): Debtor[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }

  return [...map.values()]
    .map((group) => ({
      name: group[0].name,
      total: group.reduce((sum, e) => sum + e.amount, 0),
      entries: [...group].sort((a, b) => b.date.localeCompare(a.date)),
      daysOverdue: Math.max(...group.map((e) => daysSince(e.date))),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.total - a.total);
}

export function agingSummary(entries: LedgerEntry[]) {
  const buckets: Record<AgingBucket, { count: number; amount: number }> = {
    "0-30": { count: 0, amount: 0 },
    "31-60": { count: 0, amount: 0 },
    "60+": { count: 0, amount: 0 },
  };
  for (const entry of entries) {
    const b = buckets[bucketOf(daysSince(entry.date))];
    b.count += 1;
    b.amount += entry.amount;
  }
  return buckets;
}
