"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feedback, TurnResponse } from "@/lib/types";

interface Msg { role: "user" | "ai"; text: string }

export default function Conversation(props: {
  scenarioId?: number;
  persona?: string;
  speechLang: string;
  title: string;
  starters?: string[];
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  async function ensureSession(): Promise<string | null> {
    if (sessionId) return sessionId;
    const res = await fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: props.scenarioId, persona: props.persona }),
    });
    const j = await res.json();
    if (!res.ok) { setError(j.error ?? "Could not start session"); return null; }
    setSessionId(j.sessionId);
    return j.sessionId;
  }

  async function send(body: BodyInit, headers?: HeadersInit, userLabel?: string) {
    setBusy(true);
    setError("");
    const id = await ensureSession();
    if (!id) return setBusy(false);
    if (userLabel) setMsgs((m) => [...m, { role: "user", text: userLabel }]);
    try {
      const res = await fetch(`/api/sessions/${id}/turn`, { method: "POST", headers, body });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong");
      const t = j as TurnResponse;
      setMsgs((m) => {
        // For audio turns the user bubble is added once we know the transcript.
        const base = userLabel ? m : [...m, { role: "user" as const, text: t.transcript }];
        return [...base, { role: "ai", text: t.reply }];
      });
      setFeedback(t.feedback);
      setNote(t.degraded ? "AI provider unavailable: showing demo reply and placeholder feedback." : "");
      speak(t);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function speak(t: TurnResponse) {
    if (t.audioDataUrl) {
      audioEl.current?.pause();
      audioEl.current = new Audio(t.audioDataUrl);
      void audioEl.current.play().catch(() => {});
    } else if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(t.reply);
      u.lang = props.speechLang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }

  function sendText(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    setText("");
    void send(JSON.stringify({ text: v }), { "Content-Type": "application/json" }, v);
  }

  async function toggleMic() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        void send(form);
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone unavailable. Allow access in your browser, or type instead.");
    }
  }

  async function finish() {
    if (!sessionId) return router.push("/app/scenarios");
    await fetch(`/api/sessions/${sessionId}/finish`, { method: "POST" });
    router.push(`/app/sessions/${sessionId}`);
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{props.title}</h1>
        <button className="btn secondary" onClick={finish}>End lesson</button>
      </div>
      <div className="chat">
        <section className="card" aria-label="Conversation">
          <div className="msgs" aria-live="polite">
            {!msgs.length && (
              <p className="muted">
                Press the microphone and speak, or type below.
                {props.starters?.length ? ` Try: "${props.starters.join('" or "')}"` : ""}
              </p>
            )}
            {msgs.map((m, i) => <div key={i} className={`msg ${m.role === "user" ? "user" : ""}`}>{m.text}</div>)}
            {busy && <div className="msg muted">Thinking...</div>}
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          {note && <p className="muted">{note}</p>}
          <div className="row" style={{ marginTop: ".75rem" }}>
            <button className="btn" onClick={toggleMic} disabled={busy} aria-pressed={recording}>
              {recording ? "Stop and send" : "Speak"}
            </button>
            <form style={{ display: "flex", gap: ".5rem", flex: 1 }} onSubmit={(e) => { e.preventDefault(); sendText(text); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type here" aria-label="Type a message" />
              <button className="btn secondary" disabled={busy || !text.trim()}>Send</button>
            </form>
          </div>
        </section>

        <aside className="card" aria-label="Feedback">
          <h2>Live feedback</h2>
          {!feedback ? <p className="muted">Scores and corrections appear after your first turn.</p> : (
            <>
              {([["Grammar", feedback.grammar_score], ["Pronunciation (estimated)", feedback.pronunciation_score], ["Vocabulary", feedback.vocabulary_score]] as const).map(([label, v]) => (
                <div key={label}>
                  <div className="score"><span>{label}</span><b>{v}</b></div>
                  <div className="bar"><i style={{ width: `${v}%` }} /></div>
                </div>
              ))}
              {feedback.corrections.map((c, i) => (
                <p key={i}><s>{c.original}</s> &rarr; <b>{c.corrected}</b><br /><span className="muted">{c.explanation}</span></p>
              ))}
              {feedback.suggestions.map((s, i) => <p key={i} className="muted">Tip: {s}</p>)}
              {feedback.vocabulary.length > 0 && (
                <>
                  <h2>New words</h2>
                  {feedback.vocabulary.map((v, i) => <p key={i}><b>{v.word}</b>: {v.translation}</p>)}
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
