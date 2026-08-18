import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
}

export function createGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Receipt scan is not configured. Set GEMINI_API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
}
