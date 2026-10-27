export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface VocabItem {
  word: string;
  translation: string;
  example: string;
}

export interface Feedback {
  grammar_score: number;
  /** Estimated from the transcript only. Not a phonetic assessment. */
  pronunciation_score: number;
  vocabulary_score: number;
  corrections: Correction[];
  suggestions: string[];
  vocabulary: VocabItem[];
}

export interface TurnResponse {
  transcript: string;
  reply: string;
  audioDataUrl: string | null;
  feedback: Feedback;
  turnsUsed: number | null;
  dailyLimit: number | null;
  /** True when a fallback reply was used because the AI provider was unavailable. */
  degraded: boolean;
}
