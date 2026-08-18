import { RECEIPT_PROMPT, modelTextToDraft, type ReceiptDraft } from "@/lib/receipt";
import { createGeminiClient, getGeminiApiKey, getGeminiModel } from "@/lib/gemini";

export type ScannedSaleDraft = {
  soldAtIso: string;
  taxRate: string;
  note: string;
  receiverName: string;
  receiverAccount: string;
  receiverContact: string;
  receiverAddress: string;
  lines: Array<{ name: string; quantity: number; unitPriceCents: number }>;
};

export type ScanReceiptResult =
  | { error: string; draft?: undefined }
  | { error?: undefined; draft: ScannedSaleDraft };

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

function mimeFromFile(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (name.endsWith(".png")) {
    return "image/png";
  }
  return null;
}

function toFormDraft(draft: ReceiptDraft): ScannedSaleDraft {
  return {
    soldAtIso: (draft.soldAt ?? new Date()).toISOString(),
    taxRate: (draft.taxRateBps / 100).toString(),
    note: draft.note,
    receiverName: draft.receiverName,
    receiverAccount: draft.receiverAccount,
    receiverContact: draft.receiverContact,
    receiverAddress: draft.receiverAddress,
    lines: draft.lines,
  };
}

export function apiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/api key|api_key|unauthenticated|401|permission/i.test(message)) {
    return "Gemini rejected the API key. Check GEMINI_API_KEY.";
  }
  if (/quota|rate limit|resource exhausted|429/i.test(message)) {
    return "Gemini quota was hit. Wait a minute and try again.";
  }
  if (/not found|404|model/i.test(message) && /gemini/i.test(message)) {
    return "That Gemini model is not available for this key. Set GEMINI_MODEL to a vision model you can use.";
  }
  return message || "Could not read that receipt. Try again or enter the sale by hand.";
}

export async function scanReceiptImage(formData: FormData): Promise<ScanReceiptResult> {
  if (!getGeminiApiKey()) {
    return { error: "Receipt scan is not configured. Set GEMINI_API_KEY in .env." };
  }
  if (!formData || typeof formData.get !== "function") {
    return { error: "Choose a receipt photo first." };
  }

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a receipt photo first." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That photo is too large. Use a JPEG or PNG under 4 MB." };
  }
  const mime = mimeFromFile(file);
  if (!mime) {
    return { error: "Use a JPEG or PNG photo of the receipt." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const client = createGeminiClient();
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: [
        {
          role: "user",
          parts: [
            { text: RECEIPT_PROMPT },
            { inlineData: { mimeType: mime, data: bytes.toString("base64") } },
          ],
        },
      ],
    });

    const text = response.text?.trim();

    if (!text) {
      return { error: "The scanner returned an empty result. Try a clearer photo." };
    }
    return { draft: toFormDraft(modelTextToDraft(text)) };
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }
}
