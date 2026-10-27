"use client";

import { useCallback, useEffect, useState } from "react";

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
    <>
      <h1>Vocabulary practice</h1>
      <p className="muted">New words from your conversations appear here, scheduled with spaced repetition.</p>
      {error && <p className="err" role="alert">{error}</p>}
      {cards === null && !error && <p className="muted">Loading...</p>}
      {cards && !card && <div className="card"><p>Nothing due right now. Have a conversation to collect new words.</p></div>}
      {card && (
        <>
          <p className="muted">{cards!.length} due</p>
          <div className="card flash" onClick={() => setFlipped((f) => !f)} role="button" tabIndex={0}
               onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setFlipped((f) => !f)}>
            <div className="word">{card.word}</div>
            {flipped ? (
              <>
                <p><b>{card.translation}</b></p>
                {card.example && <p className="muted">{card.example}</p>}
              </>
            ) : <p className="muted">Click to reveal</p>}
          </div>
          {flipped && (
            <div className="row" style={{ marginTop: "1rem" }}>
              <button className="btn danger" onClick={() => review(1)}>Again</button>
              <button className="btn secondary" onClick={() => review(3)}>Hard</button>
              <button className="btn" onClick={() => review(4)}>Good</button>
              <button className="btn secondary" onClick={() => review(5)}>Easy</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
