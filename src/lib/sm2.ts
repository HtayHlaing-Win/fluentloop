export interface CardState {
  interval_days: number;
  ease: number;
  repetitions: number;
}

/** SM-2 spaced repetition. quality: 0-5 (UI sends 1 Again, 3 Hard, 4 Good, 5 Easy). */
export function sm2(card: CardState, quality: number) {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { interval_days, ease, repetitions } = card;

  if (q < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.max(1, Math.round(interval_days * ease));
    repetitions += 1;
  }

  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const next_review = new Date(Date.now() + interval_days * 86_400_000).toISOString();
  return { interval_days, ease, repetitions, next_review };
}
