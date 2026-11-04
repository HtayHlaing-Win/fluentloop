"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleAlert, CircleCheck, Lightbulb, Mic, Play, Send, Square, Volume2, VolumeX } from "lucide-react";
import type { Feedback, TurnResponse } from "@/lib/types";
import { categoryVisual } from "@/lib/scenario-visuals";
import { inputClass } from "@/components/form-styles";
import CoverImage from "@/components/CoverImage";

interface Msg { role: "user" | "ai"; text: string; audio?: string }

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="font-display text-xl font-extrabold text-primary">{v}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-700"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return <p className="text-sm text-muted-foreground">Scores and corrections appear after your first turn.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Meter label="Grammar" value={feedback.grammar_score} />
        <Meter label="Pronunciation (estimated)" value={feedback.pronunciation_score} />
        <Meter label="Vocabulary" value={feedback.vocabulary_score} />
      </div>

      {feedback.corrections.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold">
            <CircleAlert size={14} className="text-primary" aria-hidden="true" />
            Corrections
          </div>
          <div className="space-y-2">
            {feedback.corrections.map((c, i) => (
              <div key={i} className="rounded-xl border bg-background p-3">
                <div className="text-[0.82rem] text-muted-foreground line-through">{c.original}</div>
                <div className="mt-0.5 flex items-start gap-1.5 text-[0.82rem] font-medium text-success">
                  <CircleCheck size={12} className="mt-1 shrink-0" aria-hidden="true" />
                  {c.corrected}
                </div>
                {c.explanation && <div className="mt-1 text-xs text-muted-foreground">{c.explanation}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.suggestions.length > 0 && (
        <div className="space-y-2">
          {feedback.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-[0.78rem] font-medium text-secondary-foreground">
              <Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Tip: {s}</span>
            </div>
          ))}
        </div>
      )}

      {feedback.vocabulary.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold">
            <Lightbulb size={14} className="text-accent" aria-hidden="true" />
            New words
          </div>
          <div className="space-y-2">
            {feedback.vocabulary.map((v, i) => (
              <div key={i} className="rounded-xl border bg-background p-3">
                <div className="text-sm font-semibold text-accent">{v.word}</div>
                <div className="text-[0.78rem] text-muted-foreground">{v.translation}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ who }: { who: "ai" | "user" }) {
  return who === "ai" ? (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[0.65rem] font-extrabold text-primary-foreground">
      AI
    </span>
  ) : (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.65rem] font-extrabold text-primary">
      You
    </span>
  );
}

export default function Conversation(props: {
  scenarioId?: number;
  persona?: string;
  speechLang: string;
  title: string;
  starters?: string[];
  /** Scenario category, used for the banner picture. */
  category?: string;
  /** Learner's target language, shown in the banner. */
  language?: string;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

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
        return [...base, { role: "ai", text: t.reply, audio: t.audioDataUrl ?? undefined }];
      });
      setFeedback(t.feedback);
      setNote(t.degraded ? "AI provider unavailable: showing demo reply and placeholder feedback." : "");
      if (!mutedRef.current) play(t.reply, t.audioDataUrl ?? undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** Speak a reply, using the generated voice when there is one and the browser voice otherwise. */
  function play(reply: string, audio?: string) {
    audioEl.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audio) {
      audioEl.current = new Audio(audio);
      void audioEl.current.play().catch(() => {});
    } else if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(reply);
      u.lang = props.speechLang;
      window.speechSynthesis.speak(u);
    }
  }

  function toggleMute() {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      audioEl.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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

  const visual = props.scenarioId != null ? categoryVisual(props.category) : null;
  const BannerIcon = visual?.icon;
  const back = props.scenarioId != null
    ? { href: "/app/scenarios", label: "Scenarios" }
    : { href: "/app/free-talk", label: "Free Talk" };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      {/* Banner */}
      <header className="relative h-32 shrink-0 overflow-hidden bg-linear-to-br from-primary to-accent">
        {BannerIcon && (
          <span className="absolute inset-0 flex items-center justify-center text-primary-foreground/30">
            <BannerIcon size={72} aria-hidden="true" />
          </span>
        )}
        {visual && (
          <CoverImage src={visual.photoUrl(1200, 500)} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl items-end justify-between gap-3 px-4 pb-4 text-white sm:px-6">
          <div className="min-w-0">
            <Link href={back.href} className="mb-1 flex items-center gap-1 text-xs text-white/80 transition-colors hover:text-white">
              <ChevronLeft size={14} aria-hidden="true" />
              {back.label}
            </Link>
            <h1 className="truncate text-xl font-extrabold text-white">{props.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {props.language && (
              <span className="hidden rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm sm:inline">
                {props.language}
              </span>
            )}
            <button
              type="button"
              onClick={finish}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              End lesson
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation">
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
            {!msgs.length && !busy && (
              <div className="mx-auto mt-4 max-w-md rounded-2xl border bg-card p-6 text-center">
                <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Mic size={20} aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">Press the microphone and speak, or type below.</p>
                {props.starters && props.starters.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Try:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {props.starters.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setText(s)}
                          className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {msgs.map((m, i) =>
              m.role === "ai" ? (
                <div key={i} className="flex items-start gap-3">
                  <Avatar who="ai" />
                  <div className="max-w-lg rounded-2xl rounded-tl-none border bg-card px-4 py-3">
                    <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    <button
                      type="button"
                      onClick={() => play(m.text, m.audio)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Play size={12} aria-hidden="true" />
                      Play audio
                    </button>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start justify-end gap-3">
                  <div className="max-w-lg rounded-2xl rounded-tr-none bg-primary px-4 py-3 text-primary-foreground">
                    <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <Avatar who="user" />
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-start gap-3">
                <Avatar who="ai" />
                <div className="rounded-2xl rounded-tl-none border bg-card px-4 py-3 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Feedback on small screens */}
          <details className="border-t bg-card lg:hidden">
            <summary className="px-4 py-3 text-sm font-semibold">Live feedback</summary>
            <div className="max-h-64 overflow-y-auto px-4 pb-4">
              <FeedbackPanel feedback={feedback} />
            </div>
          </details>

          {/* Controls */}
          <div className="shrink-0 border-t bg-card px-4 py-4 sm:px-6">
            {error && <p className="mb-3 text-center text-sm text-destructive" role="alert">{error}</p>}
            {note && <p className="mb-3 text-center text-sm text-muted-foreground">{note}</p>}

            {recording && (
              <div className="mx-auto mb-4 flex max-w-xl items-center gap-3 rounded-xl bg-secondary px-4 py-3" role="status">
                <div className="flex h-9 flex-1 items-end gap-0.5" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span
                      key={i}
                      className="wave-bar h-full flex-1 rounded-full bg-primary"
                      style={{ animationDelay: `${(i % 8) * 90}ms` }}
                    />
                  ))}
                </div>
                <span className="text-[0.8rem] font-semibold text-primary">Listening...</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? "Unmute AI voice" : "Mute AI voice"}
                className="flex h-11 w-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
              </button>

              <button
                type="button"
                onClick={toggleMic}
                disabled={busy}
                aria-pressed={recording}
                aria-label={recording ? "Stop and send" : "Speak"}
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  recording
                    ? "bg-destructive text-destructive-foreground shadow-[0_0_0_8px_color-mix(in_srgb,var(--destructive)_18%,transparent)]"
                    : "bg-linear-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_45%,transparent)] hover:scale-105"
                }`}
              >
                {recording ? <Square size={22} aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}
              </button>

              {/* Balances the mute button so the microphone stays centred. */}
              <span className="h-11 w-11" aria-hidden="true" />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {recording ? "Tap to stop and send" : "Tap the microphone to speak"}
            </p>

            <form
              className="mx-auto mt-3 flex max-w-xl gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendText(text);
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Or type here"
                aria-label="Type a message"
                className={`${inputClass} py-2.5 text-sm`}
              />
              <button className="btn secondary px-4" disabled={busy || !text.trim()} aria-label="Send">
                <Send size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>

        {/* Feedback sidebar */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-card lg:block" aria-label="Feedback">
          <div className="p-5">
            <h2 className="mb-4">Live feedback</h2>
            <FeedbackPanel feedback={feedback} />
          </div>
        </aside>
      </div>
    </div>
  );
}
