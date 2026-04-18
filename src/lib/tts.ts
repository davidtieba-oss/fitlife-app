// Client-side TTS helpers: markdown stripping, number-to-speech normalization,
// chunking at sentence boundaries, and calling the /api/tts proxy.

import { addTtsUsage } from "./tts-settings";

/** Strip markdown formatting so TTS reads plain prose. */
export function stripMarkdown(input: string): string {
  let text = input;
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/\*(.+?)\*/g, "$1");
  text = text.replace(/__(.+?)__/g, "$1");
  text = text.replace(/_(.+?)_/g, "$1");
  text = text.replace(/^\s*[-*•]\s+/gm, "");
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 100) return twoDigits(n);
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0
      ? `${ONES[h]} hundred`
      : `${ONES[h]} hundred ${twoDigits(rest)}`;
  }
  if (n < 10000 && n % 100 === 0) {
    return `${twoDigits(n / 100)} hundred`;
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const head = integerToWords(thousands) + " thousand";
    return rest === 0 ? head : `${head} ${integerToWords(rest)}`;
  }
  return String(n);
}

const UNIT_WORDS: Record<string, { singular: string; plural: string }> = {
  kg: { singular: "kilogram", plural: "kilograms" },
  g: { singular: "gram", plural: "grams" },
  mg: { singular: "milligram", plural: "milligrams" },
  lb: { singular: "pound", plural: "pounds" },
  lbs: { singular: "pound", plural: "pounds" },
  oz: { singular: "ounce", plural: "ounces" },
  km: { singular: "kilometer", plural: "kilometers" },
  m: { singular: "meter", plural: "meters" },
  cm: { singular: "centimeter", plural: "centimeters" },
  mm: { singular: "millimeter", plural: "millimeters" },
  mi: { singular: "mile", plural: "miles" },
  ml: { singular: "milliliter", plural: "milliliters" },
  l: { singular: "liter", plural: "liters" },
  min: { singular: "minute", plural: "minutes" },
  mins: { singular: "minute", plural: "minutes" },
  hr: { singular: "hour", plural: "hours" },
  hrs: { singular: "hour", plural: "hours" },
  sec: { singular: "second", plural: "seconds" },
  s: { singular: "second", plural: "seconds" },
};

export function normalizeNumbersForSpeech(input: string): string {
  return input.replace(
    /\b(\d+)(?:\.(\d+))?\s*([a-zA-Z]+)?\b/g,
    (match, intPart: string, decPart: string | undefined, unit: string | undefined) => {
      const n = parseInt(intPart, 10);
      if (decPart !== undefined) return match;
      if (n >= 1_000_000) return match;

      const words = integerToWords(n);
      if (!unit) return words;

      const lower = unit.toLowerCase();
      const unitEntry = UNIT_WORDS[lower];
      if (unitEntry) {
        return `${words} ${n === 1 ? unitEntry.singular : unitEntry.plural}`;
      }
      return `${words} ${unit}`;
    }
  );
}

export function chunkTextForTts(text: string, maxChars = 1500): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return [trimmed];

  const sentences = trimmed.match(/[^.!?\n]+[.!?]+|\s*[^.!?\n]+\s*$/g) ?? [trimmed];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((current + " " + piece).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function prepareTtsText(raw: string): string {
  return normalizeNumbersForSpeech(stripMarkdown(raw));
}

export async function requestTtsAudio(
  text: string,
  voice: string
): Promise<{ url: string; chars: number; mime: string }> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    let errMsg = `TTS request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) errMsg = data.error;
    } catch {}
    throw new Error(errMsg);
  }

  const chars = Number(res.headers.get("X-Tts-Chars")) || text.length;
  addTtsUsage(chars);

  const blob = await res.blob();
  const mime = blob.type || "audio/mpeg";
  const url = URL.createObjectURL(blob);
  return { url, chars, mime };
}
