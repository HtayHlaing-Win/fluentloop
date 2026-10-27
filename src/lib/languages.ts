export const LANGUAGES = [
  { name: "Spanish", code: "es-ES" },
  { name: "French", code: "fr-FR" },
  { name: "German", code: "de-DE" },
  { name: "Italian", code: "it-IT" },
  { name: "Portuguese", code: "pt-BR" },
  { name: "Japanese", code: "ja-JP" },
  { name: "Korean", code: "ko-KR" },
  { name: "Mandarin Chinese", code: "zh-CN" },
  { name: "Vietnamese", code: "vi-VN" },
  { name: "English", code: "en-US" },
] as const;

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export function langCode(name: string): string {
  return LANGUAGES.find((l) => l.name === name)?.code ?? "en-US";
}

export const PERSONAS: Record<string, { label: string; blurb: string; prompt: string; starters: string[] }> = {
  friendly: {
    label: "Friendly Pal",
    blurb: "Relaxed, encouraging everyday chat.",
    prompt: "You are a warm, encouraging friend. Keep the chat light and ask follow-up questions.",
    starters: ["Tell me about your day.", "What do you like to do on weekends?"],
  },
  career: {
    label: "Career Coach",
    blurb: "Professional vocabulary and workplace talk.",
    prompt: "You are a supportive career coach. Steer the conversation to work, goals and professional communication.",
    starters: ["Describe your current job.", "Where do you see yourself in five years?"],
  },
  debate: {
    label: "Debate Partner",
    blurb: "Defend opinions and practise arguments.",
    prompt: "You are a polite but challenging debate partner. Take a position, disagree respectfully and ask the learner to justify theirs.",
    starters: ["Is remote work better than office work?", "Should cities ban cars in the centre?"],
  },
  professor: {
    label: "Strict Professor",
    blurb: "Precise grammar, firm corrections.",
    prompt: "You are a strict but fair language professor. Insist on correct grammar and ask the learner to repeat sentences correctly.",
    starters: ["Describe your home in five sentences.", "Explain your daily routine."],
  },
};
