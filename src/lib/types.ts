export type ExtractedEntry = {
  name: string;
  item?: string;
  amount: number;
  date?: string;
  confidence: number;
};

export type LedgerEntry = {
  id: string;
  name: string;
  item: string;
  amount: number;
  date: string;
  confidence: number;
};

export type Debtor = {
  name: string;
  total: number;
  entries: LedgerEntry[];
  daysOverdue: number;
};

export type AgingBucket = "0-30" | "31-60" | "60+";
