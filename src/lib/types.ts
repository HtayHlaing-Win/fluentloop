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
  /** The partner's reply translated into the learner's native language. */
  reply_translation?: string;
  /** The learner's last message said naturally in the target language (when they did not use it). */
  target_version?: string;
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
