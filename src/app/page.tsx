import Link from "next/link";

export default function Landing() {
  return (
    <main className="wrap">
      <div className="hero">
        <h1>Speak your new language, out loud.</h1>
        <p className="muted" style={{ maxWidth: 560, margin: "0 auto 1.5rem" }}>
          Practise real spoken conversations with an AI partner. Get instant feedback on grammar and
          vocabulary, and turn new words into spaced-repetition flashcards.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/register">Get started</Link>
          <Link className="btn secondary" href="/login">Sign in</Link>
        </div>
      </div>
      <div className="grid">
        <div className="card"><h2>Scenarios</h2><p className="muted">Restaurants, travel, interviews, emergencies, all by CEFR level.</p></div>
        <div className="card"><h2>Free Talk</h2><p className="muted">Pick a persona: friendly pal, career coach, debate partner or strict professor.</p></div>
        <div className="card"><h2>Live feedback</h2><p className="muted">Scores, corrections and vocabulary after every turn.</p></div>
        <div className="card"><h2>Flashcards</h2><p className="muted">Words from your conversations, scheduled with SM-2.</p></div>
      </div>
    </main>
  );
}
