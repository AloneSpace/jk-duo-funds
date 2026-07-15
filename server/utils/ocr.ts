/**
 * Tesseract.js server-side OCR utility
 *
 * Used when no Gemini API key is configured.
 * Reads text from a bank transfer slip image and extracts structured fields.
 */
import { createWorker } from "tesseract.js";

// ── OCR ───────────────────────────────────────────────────────────────────────

export async function extractSlipText(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  // eng for numbers/latin, tha for Thai characters
  const worker = await createWorker(["eng", "tha"]);
  try {
    const { data } = await worker.recognize(buffer);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// ── Field parsing ─────────────────────────────────────────────────────────────

export interface OcrSlipFields {
  amount: number | null;
  transaction_date: string | null;
  transaction_time: string | null;
  bank_name: string | null;
}

export function parseSlipFields(text: string): OcrSlipFields {
  // ── Amount ────────────────────────────────────────────────────────────────
  // Match patterns like 1,000.00 / 1000.00 / 1 000.00
  const amountCandidates = Array.from(
    text.matchAll(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/g),
  )
    .map((m) => parseFloat(m[0].replace(/[,\s]/g, "")))
    .filter((n) => isFinite(n) && n >= 1 && n <= 10_000_000);

  // Pick the largest number that is likely the transfer amount
  const amount = amountCandidates.length ? Math.max(...amountCandidates) : null;

  // ── Date ──────────────────────────────────────────────────────────────────
  // Patterns: DD/MM/YYYY  DD-MM-YYYY  DD MM YYYY (Buddhist or Gregorian)
  let transaction_date: string | null = null;
  const dateMatch = text.match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    let year = parseInt(dateMatch[3]);
    if (year < 100) year += 2000; // 2-digit year
    if (year > 2500) year -= 543; // Buddhist Era → Gregorian
    transaction_date = `${year}-${month}-${day}`;
  }

  // ── Time ──────────────────────────────────────────────────────────────────
  let transaction_time: string | null = null;
  const timeMatch = text.match(/(\d{2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    transaction_time = `${timeMatch[1]}:${timeMatch[2]}`;
  }

  // ── Bank name ─────────────────────────────────────────────────────────────
  const lower = text.toLowerCase();
  let bank_name: string | null = null;

  const bankMap: Array<[string, string[]]> = [
    ["KBank", ["kasikorn", "kbank", "กสิกร"]],
    ["SCB", ["siam commercial", "scb", "ไทยพาณิชย์", "พาณิชย์"]],
    ["KTB", ["krungthai", "ktb", "กรุงไทย"]],
    ["BBL", ["bangkok bank", "bbl", "กรุงเทพ"]],
    ["Krungsri", ["krungsri", "ayudhya", "กรุงศรี", "อยุธยา"]],
    ["TTB", ["ttb", "tmb", "thanachart", "ธนชาต"]],
    ["GSB", ["gsb", "ออมสิน", "government savings"]],
    ["PromptPay", ["promptpay", "พร้อมเพย์", "prompt pay"]],
  ];

  for (const [name, keywords] of bankMap) {
    if (keywords.some((k) => lower.includes(k))) {
      bank_name = name;
      break;
    }
  }

  return { amount, transaction_date, transaction_time, bank_name };
}
