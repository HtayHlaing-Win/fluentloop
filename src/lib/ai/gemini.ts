import type { Feedback } from "@/lib/types";

const MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.6-flash,gemini-3.8-flash,gemini-3.5-flash-lite,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Calls Gemini, trying each configured model in order. Returns null if all fail. */
async function generate(opts: {
  system?: string;
  parts: Part[];
  json?: boolean;
}): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("[gemini] GEMINI_API_KEY is not set on the server");
    return null;
  }

  const body = {
    contents: [{ role: "user", parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      // No temperature: newer Gemini models reject it. Extra headroom because
      // their internal thinking counts toward the output limit.
      maxOutputTokens: 4096,
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
        console.warn(`[gemini] ${model} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
): Promise<string | null> {
  const text = await generate({
    parts: [
      { inlineData: { mimeType, data: audio.toString("base64") } },
      {
        text: `Transcribe this audio word for word in the language the speaker actually used. The speaker is learning ${language} but may speak English or mix languages: never translate, correct or reply to it. If you cannot hear any speech, return an empty string. Return only the transcript text, with no commentary.`,
      },
    ],
  });
  // null = the AI call failed; "" = it worked but heard no speech.
  return text;
}

export interface ConverseInput {
  scenarioPrompt: string;
  language: string;
  /** The learner's mother language, used for translations and explanations. */
  nativeLanguage: string;
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
  const native = input.nativeLanguage || "English";
  const same = native === input.language;
  const system = [
    `You are a spoken ${input.language} conversation partner for a ${input.level} (CEFR) learner.`,
    input.scenarioPrompt,
    `The learner's native language is ${native}. They may speak or type in ${native}, in ${input.language}, or a mix: understand all of it and always keep the conversation going in ${input.language}.`,
    `Reply in ${input.language} only, in character, in 1-3 short sentences suited to ${input.level}. End with a question or prompt that keeps the learner talking.`,
    `Also assess the learner's LAST message. Respond with JSON only, in exactly this shape:`,
    `{"reply": string, "reply_translation": string (the reply translated into ${native}${same ? "; use an empty string" : ""}),`,
    ` "target_version": string (the learner's last message said naturally in ${input.language}; use an empty string if it was already correct ${input.language}),`,
    ` "grammar_score": 0-100, "pronunciation_score": 0-100, "vocabulary_score": 0-100,`,
    ` "corrections": [{"original": string, "corrected": string, "explanation": string (in ${native})}],`,
    ` "suggestions": [string (in ${native})],`,
    ` "vocabulary": [{"word": string (${input.language}), "translation": string (${native}), "example": string (${input.language})}]}`,
    `If the learner wrote in ${native} instead of ${input.language}, give no corrections: fill target_version instead and score grammar and vocabulary 70.`,
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
            reply_translation: typeof j.reply_translation === "string" ? j.reply_translation.trim() : "",
            target_version: typeof j.target_version === "string" ? j.target_version.trim() : "",
          },
        };
      }
    } catch {
      console.warn("[gemini] could not parse JSON reply");
    }
  }
  return fallback(input);
}

/** Placeholder result when no API key is set or every model fails. The pipeline never shows it to learners. */
function fallback(input: ConverseInput): ConverseResult {
  return {
    degraded: true,
    reply: `You said: "${input.userText}". Could you tell me more in ${input.language}?`,
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
