"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Layers } from "lucide-react";
import Container from "@/components/Container";

interface Card { id: string; word: string; translation: string; example: string }

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/flashcards/due");
    const j = await res.json();
    if (!res.ok) return setError(j.error ?? "Could not load cards");
    setCards(j.cards);
    setFlipped(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(quality: 1 | 3 | 4 | 5) {
    if (!cards?.length) return;
    const [current, ...rest] = cards;
    setCards(rest);
    setFlipped(false);
    const res = await fetch(`/api/flashcards/${current.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quality }),
    });
    if (!res.ok) setError("Could not save that review.");
  }

  const card = cards?.[0];

  return (
    <Container size="sm">
      <h1>Vocabulary practice</h1>
      <p className="mt-1 text-muted-foreground">
        New words from your conversations appear here, scheduled with spaced repetition.
      </p>

      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
      {cards === null && !error && <p className="mt-6 text-sm text-muted-foreground">Loading...</p>}

      {cards && !card && (
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Layers size={22} aria-hidden="true" />
          </span>
          <p className="text-[0.95rem]">Nothing due right now. Have a conversation to collect new words.</p>
          <Link href="/app/scenarios" className="btn mt-5 rounded-xl">Find a scenario</Link>
        </div>
      )}

      {card && (
        <div className="mt-8">
          <p className="mb-3 text-sm font-medium text-muted-foreground">{cards!.length} due</p>

          <div
            role="button"
            tabIndex={0}
            aria-label={flipped ? "Hide answer" : "Reveal answer"}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setFlipped((f) => !f)}
            className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border bg-card p-8 text-center shadow-lg transition-shadow hover:shadow-xl"
          >
            <div className="font-display text-4xl font-extrabold tracking-tight">{card.word}</div>
            {flipped ? (
              <div className="mt-5 space-y-2">
                <p className="text-xl font-semibold text-primary">{card.translation}</p>
                {card.example && <p className="text-sm text-muted-foreground">{card.example}</p>}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">Click to reveal</p>
            )}
          </div>

          {flipped && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button className="btn danger" onClick={() => review(1)}>Again</button>
              <button className="btn secondary" onClick={() => review(3)}>Hard</button>
              <button className="btn" onClick={() => review(4)}>Good</button>
              <button className="btn secondary" onClick={() => review(5)}>Easy</button>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
