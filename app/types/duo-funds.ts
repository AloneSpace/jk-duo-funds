export type AnalysisConfidence = "high" | "medium" | "low";

export type TransactionStatus = "pending" | "confirmed" | "edited";

export type DateRangePreset = "all" | "7d" | "30d" | "month";

export type AuthProvider = "firebase";

export interface DuoUser {
  uid: string;
  displayName: string;
  email: string;
  pairId: string;
  provider: AuthProvider;
}

export interface DuoPairMember {
  id: string;
  displayName: string;
  role: "me" | "partner";
  accent: "emerald" | "sky";
}

export interface DuoPair {
  id: string;
  name: string;
  memberIds: string[];
  members: DuoPairMember[];
}

export interface SlipAnalysisResult {
  amount: number | null;
  transaction_date: string | null;
  transaction_time: string | null;
  bank_name: string | null;
  confidence: AnalysisConfidence;
  raw_text_detected: string;
  aiRawResponse?: Record<string, unknown>;
}

export interface TransactionDraft {
  amount: number | null;
  transactionDate: string;
  transactionTime: string;
  bankName: string;
  note: string;
  confidence: AnalysisConfidence;
  rawTextDetected: string;
  status: TransactionStatus;
}

export interface DuoTransaction {
  id: string;
  uploaderId: string;
  uploaderName: string;
  amount: number;
  transactionDate: string;
  transactionTime: string;
  bankName: string;
  slipImageUrl: string;
  aiRawResponse: Record<string, unknown>;
  status: TransactionStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DateRangeSelection {
  from: string | null;
  to: string | null;
}
