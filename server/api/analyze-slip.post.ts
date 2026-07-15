import { createError, defineEventHandler, readBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { z } from "zod";
import type { SlipAnalysisResult } from "~/types/duo-funds";
import { extractSlipText, parseSlipFields } from "../utils/ocr";

const requestSchema = z.object({
  imageBase64: z.string().min(32),
  fileName: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
});

const analysisSchema = z.object({
  amount: z.coerce.number().nullable().optional(),
  transaction_date: z.string().nullable().optional(),
  transaction_time: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  confidence: z.enum(["high", "medium", "low"]).default("low"),
  raw_text_detected: z.string().default(""),
});

const fallbackAnalysis = (
  message: string,
  fileName?: string | null,
): SlipAnalysisResult => ({
  amount: null,
  transaction_date: null,
  transaction_time: null,
  bank_name: null,
  confidence: "low",
  raw_text_detected: message,
  aiRawResponse: {
    provider: "fallback",
    fileName: fileName || null,
  },
});

const stripDataPrefix = (value: string) => {
  const commaIndex = value.indexOf(",");
  return commaIndex === -1 ? value : value.slice(commaIndex + 1);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const callGemini = async (
  apiKey: string,
  imageBase64: string,
  mimeType: string | null | undefined,
  prompt: string,
  maxRetries = 3,
): Promise<Response> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: stripDataPrefix(imageBase64),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body,
    });

    if (response.status !== 429 || attempt === maxRetries) {
      return response;
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = 1000 * 2 ** attempt;
    console.warn(
      `Gemini 429 — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
    );
    await sleep(delay);
  }

  // Should never reach here, but TypeScript needs a return
  throw new Error("Gemini retry loop exhausted");
};

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const body = await readBody(event);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid slip payload.",
    });
  }

  const { imageBase64, fileName, mimeType, fileSize } = parsed.data;

  if (fileSize && fileSize > 8 * 1024 * 1024) {
    throw createError({
      statusCode: 413,
      statusMessage:
        "Slip image is too large. Please upload a file smaller than 8 MB.",
    });
  }

  const apiKey = runtimeConfig.geminiApiKey;

  // ── Tesseract path (no Gemini key configured) ─────────────────────────────
  if (!apiKey) {
    try {
      console.log("[OCR] No Gemini key — using Tesseract.js");
      const rawText = await extractSlipText(stripDataPrefix(imageBase64));
      const fields = parseSlipFields(rawText);

      const hasFields = Boolean(fields.amount || fields.transaction_date);

      return {
        amount: fields.amount,
        transaction_date: fields.transaction_date,
        transaction_time: fields.transaction_time,
        bank_name: fields.bank_name,
        confidence: hasFields ? ("medium" as const) : ("low" as const),
        raw_text_detected: rawText.trim(),
        aiRawResponse: {
          provider: "tesseract",
          fileName: fileName || null,
          fields,
        },
      } satisfies SlipAnalysisResult;
    } catch (err) {
      console.error("[OCR] Tesseract failed:", err);
      return fallbackAnalysis(
        "OCR analysis failed. Please fill in the details manually.",
        fileName,
      );
    }
  }

  // ── Gemini path (API key present) ─────────────────────────────────────────

  const prompt = `You are a financial slip analyzer for Duo Funds. Return ONLY valid JSON with this exact shape:
{
  "amount": 1250.00,
  "transaction_date": "2026-07-02",
  "transaction_time": "14:32",
  "bank_name": "SCB",
  "confidence": "high",
  "raw_text_detected": "..."
}

Rules:
- Use null for unknown values.
- confidence must be one of high, medium, low.
- If you are not very sure about amount or date, set confidence to low.
- Do not wrap the JSON in markdown.
- Extract the actual slip details from the provided image.`;

  const response = await callGemini(apiKey, imageBase64, mimeType, prompt);

  console.log(`Gemini response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const msg =
      response.status === 429
        ? "Gemini rate limit reached — please wait a moment and try again."
        : "The AI provider returned an error, so the slip needs manual review.";
    return fallbackAnalysis(msg, fileName);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") || "";

  if (!text) {
    return fallbackAnalysis(
      "The AI provider returned an empty response, so the slip needs manual review.",
      fileName,
    );
  }

  try {
    const parsedResult = analysisSchema.parse(JSON.parse(text));

    return {
      amount: parsedResult.amount ?? null,
      transaction_date: parsedResult.transaction_date ?? null,
      transaction_time: parsedResult.transaction_time ?? null,
      bank_name: parsedResult.bank_name ?? null,
      confidence: parsedResult.confidence,
      raw_text_detected: parsedResult.raw_text_detected,
      aiRawResponse: {
        provider: "gemini",
        fileName: fileName || null,
        parsed: parsedResult,
        raw: payload,
      },
    };
  } catch {
    return fallbackAnalysis(
      "The AI response could not be parsed, so the slip needs manual review.",
      fileName,
    );
  }
});
