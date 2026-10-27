import type { Feedback } from "@/lib/types";

const MODELS = (process.env.GEMINI_MODELS ?? "gemini-2.5-flash,gemini-2.0-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Calls Gemini, trying each configured model in order. Returns null if all fail. */
async function generate(opts: {
  system?: string;
  parts: Part[];
  json?: boolean;
  temperature?: number;
}): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const body = {
    contents: [{ role: "user", parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      temperature: opts.temperature ?? (opts.json ? 0.3 : 0.7),
      maxOutputTokens: 1200,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        }
      );
      if (!res.ok) {
        console.warn(`[gemini] ${model} -> HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (err) {
      console.warn(`[gemini] ${model} failed:`, (err as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
  language: string
): Promise<string> {
  const text = await generate({
    parts: [
      { inlineData: { mimeType, data: audio.toString("base64") } },
      {
        text: `Transcribe this audio exactly as spoken. The speaker is a learner of ${language}. Return only the transcript text, with no commentary.`,
      },
    ],
    temperature: 0,
  });
  return text ?? "";
}

export interface ConverseInput {
  scenarioPrompt: string;
  language: string;
  level: string;
  history: { role: "user" | "assistant"; content: string }[];
  userText: string;
}

export interface ConverseResult {
  reply: string;
  feedback: Feedback;
  degraded: boolean;
}

const clamp = (n: unknown, d = 75) => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : d;
};

/**
 * One Gemini call returns both the in-character reply and the learner feedback,
 * which halves latency and free-tier quota use compared to two calls.
 */
export async function converse(input: ConverseInput): Promise<ConverseResult> {
  const system = [
    `You are a spoken ${input.language} conversation partner for a ${input.level} (CEFR) learner.`,
    input.scenarioPrompt,
    `Reply in ${input.language} only, in character, in 1-3 short sentences suited to ${input.level}. End with a question or prompt that keeps the learner talking.`,
    `Also assess the learner's LAST message. Respond with JSON only, in exactly this shape:`,
    `{"reply": string, "grammar_score": 0-100, "pronunciation_score": 0-100, "vocabulary_score": 0-100,`,
    ` "corrections": [{"original": string, "corrected": string, "explanation": string (in English)}],`,
    ` "suggestions": [string (in English)],`,
    ` "vocabulary": [{"word": string (${input.language}), "translation": string (English), "example": string (${input.language})}]}`,
    `pronunciation_score can only be estimated from the transcript (spelling and word choice that suggest mispronunciation); keep it conservative.`,
    `Include at most 3 corrections and 3 vocabulary items. Use empty arrays when nothing applies.`,
  ].join("\n");

  const transcript = input.history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Learner" : "Partner"}: ${m.content}`)
    .join("\n");

  const raw = await generate({
    system,
    json: true,
    parts: [{ text: `${transcript ? transcript + "\n" : ""}Learner: ${input.userText}\nPartner:` }],
  });

  if (raw) {
    try {
      const j = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      if (typeof j.reply === "string" && j.reply.trim()) {
        return {
          degraded: false,
          reply: j.reply.trim(),
          feedback: {
            grammar_score: clamp(j.grammar_score),
            pronunciation_score: clamp(j.pronunciation_score),
            vocabulary_score: clamp(j.vocabulary_score),
            corrections: Array.isArray(j.corrections) ? j.corrections.slice(0, 3) : [],
            suggestions: Array.isArray(j.suggestions) ? j.suggestions.slice(0, 3) : [],
            vocabulary: Array.isArray(j.vocabulary)
              ? j.vocabulary.filter((v: { word?: string }) => v?.word).slice(0, 3)
              : [],
          },
        };
      }
    } catch {
      console.warn("[gemini] could not parse JSON reply");
    }
  }
  return fallback(input);
}

/** Used when no API key is set or every model fails, so the app stays demo-able. */
function fallback(input: ConverseInput): ConverseResult {
  return {
    degraded: true,
    reply: `(Demo mode, AI unavailable) You said: "${input.userText}". Could you tell me more in ${input.language}?`,
    feedback: {
      grammar_score: 70,
      pronunciation_score: 70,
      vocabulary_score: 70,
      corrections: [],
      suggestions: ["The AI provider was unavailable, so this feedback is a placeholder."],
      vocabulary: [],
    },
  };
}
