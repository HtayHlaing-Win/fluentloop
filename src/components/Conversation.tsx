"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleAlert, Trash2, X, CircleCheck, Lightbulb, Mic, Play, Send, Square, Volume2, VolumeX } from "lucide-react";
import type { Feedback, TurnResponse } from "@/lib/types";
import { audioPeak, toWav } from "@/lib/audio";
import { langCode } from "@/lib/languages";
import { categoryVisual } from "@/lib/scenario-visuals";
import { inputClass } from "@/components/form-styles";
import CoverImage from "@/components/CoverImage";
import LimitModal from "@/components/LimitModal";

/** Minimal typings for the browser speech-recognition API (Chrome, Edge, Safari). */
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
function speechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Msg { role: "user" | "ai"; text: string; audio?: string; translation?: string; targetVersion?: string }

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
  /** Learner's mother language, used for translations. */
  nativeLanguage?: string;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showNative, setShowNative] = useState(true);
  // Which language the learner is speaking: their target language or their mother language.
  const [speakNative, setSpeakNative] = useState(false);
  const [interim, setInterim] = useState("");
  const heard = useRef("");
  const peak = useRef(0);
  const raf = useRef(0);
  const capture = useRef<{ stream: MediaStream; rec: MediaRecorder; ctx: AudioContext } | null>(null);
  const [level, setLevel] = useState(0);
  // A finished recording waits here so the learner can edit, send or delete it.
  const [draft, setDraft] = useState<{ text?: string; blob?: Blob; url?: string } | null>(null);
  const discard = useRef(false);
  const [noSignal, setNoSignal] = useState(false);
  // Which microphone to use. Empty = the browser's default (live speech recognition).
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const micLabel = useRef("");
  const viaRecognition = useRef(false);
  const recog = useRef<SpeechRec | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [limitHit, setLimitHit] = useState<{ used?: number; limit?: number | null } | null>(null);
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
    // Typed turns show their text now; voice turns show a placeholder until transcribed.
    setMsgs((m) => [...m, { role: "user", text: userLabel ?? "🎤 Transcribing…" }]);
    try {
      const res = await fetch(`/api/sessions/${id}/turn`, { method: "POST", headers, body });
      const j = await res.json();
      if (res.status === 429) {
        // Out of free turns: drop the unanswered typed bubble and show the upgrade popup.
        setMsgs((m) => m.slice(0, -1));
        setLimitHit({ used: j.turnsUsed, limit: j.dailyLimit });
        return;
      }
      if (!res.ok) throw new Error(j.error ?? "Something went wrong");
      const t = j as TurnResponse;
      setMsgs((m) => {
        // For audio turns the user bubble is added once we know the transcript.
        const base: Msg[] = userLabel ? [...m] : [...m.slice(0, -1), { role: "user" as const, text: t.transcript }];
        // If the learner used their mother language, show how to say it in the target language.
        if (t.feedback.target_version) base[base.length - 1] = { ...base[base.length - 1], targetVersion: t.feedback.target_version };
        return [...base, { role: "ai", text: t.reply, audio: t.audioDataUrl ?? undefined, translation: t.feedback.reply_translation || undefined }];
      });
      setFeedback(t.feedback);
      setNote(t.degraded ? "AI provider unavailable: showing demo reply and placeholder feedback." : "");
      if (!mutedRef.current) play(t.reply, t.audioDataUrl ?? undefined);
    } catch (e) {
      setMsgs((m) => m.slice(0, -1));
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

  /** Records raw audio alongside speech recognition: drives the level meter and acts as a fallback. */
  useEffect(() => {
    void refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput" && d.deviceId));
    } catch {
      /* not available */
    }
  }

  function noSoundMessage() {
    const who = micLabel.current ? `"${micLabel.current}"` : "the microphone";
    return `No sound is reaching ${who}. Pick another microphone below, check Windows Sound settings, or type your message.`;
  }

  async function startCapture() {
    peak.current = 0;
    setLevel(0);
    setNoSignal(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      micLabel.current = stream.getAudioTracks()[0]?.label ?? "";
      void refreshDevices();
      const ctx = new AudioContext();
      // Browsers start an AudioContext suspended unless resumed, which makes the meter read silence.
      await ctx.resume();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let m = 0;
        for (const v of buf) m = Math.max(m, Math.abs(v - 128));
        const lvl = m / 128;
        peak.current = Math.max(peak.current, lvl);
        setLevel(lvl);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.start();
      capture.current = { stream, rec, ctx };
      window.setTimeout(() => {
        if (capture.current && peak.current < 0.03) setNoSignal(true);
      }, 3000);
    } catch {
      capture.current = null;
      if (!viaRecognition.current) {
        setRecording(false);
        setError("Microphone unavailable. Allow access in your browser, choose another microphone, or type instead.");
      }
    }
  }

  function stopCapture(): Promise<Blob | null> {
    const c = capture.current;
    capture.current = null;
    cancelAnimationFrame(raf.current);
    setLevel(0);
    if (!c) return Promise.resolve(null);
    void c.ctx.close();
    return new Promise((resolve) => {
      c.rec.onstop = () => {
        c.stream.getTracks().forEach((t) => t.stop());
        resolve(chunks.current.length ? new Blob(chunks.current, { type: c.rec.mimeType || "audio/webm" }) : null);
      };
      if (c.rec.state !== "inactive") c.rec.stop();
      else c.rec.onstop?.(new Event("stop"));
    });
  }

  async function sendAudio(raw: Blob) {
    const wav = await toWav(raw);
    const form = new FormData();
    form.append("audio", wav ?? raw, wav ? "speech.wav" : "speech.webm");
    void send(form);
  }

  /** Live speech-to-text in the browser: the learner sees their words as they speak. */
  function startLiveSpeech(Ctor: new () => SpeechRec) {
    const r = new Ctor();
    r.lang = speakNative && props.nativeLanguage ? langCode(props.nativeLanguage) : props.speechLang;
    r.continuous = true;
    r.interimResults = true;
    heard.current = "";
    discard.current = false;
    setInterim("");
    r.onresult = (e) => {
      let all = "";
      for (let i = 0; i < e.results.length; i++) all += e.results[i][0].transcript;
      heard.current = all;
      setInterim(all);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone blocked. Allow access in your browser, or type instead.");
      } else if (e.error === "audio-capture") {
        setError("No microphone found. Plug one in or choose the right input device in your system settings.");
      } else if (e.error === "network") {
        setError("Browser speech recognition could not reach its server. Using the AI to transcribe instead.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(`Speech recognition problem (${e.error}). Try again or type instead.`);
      }
    };
    r.onend = async () => {
      setRecording(false);
      setInterim("");
      const said = heard.current.trim();
      const blob = await stopCapture();
      if (discard.current) {
        discard.current = false;
        return;
      }
      if (said) return setDraft({ text: said });
      // The browser heard no words. If the recording has sound, let the AI transcribe it instead.
      const loud = blob ? await audioPeak(blob) : 0;
      if (blob && (loud < 0 || loud > 0.02)) {
        setError("");
        return setDraft({ blob, url: URL.createObjectURL(blob) });
      }
      setError(noSoundMessage());
    };
    recog.current = r;
    viaRecognition.current = true;
    setError("");
    setRecording(true);
    void startCapture();
    r.start();
  }

  function cancelRecording() {
    discard.current = true;
    if (viaRecognition.current && recog.current) recog.current.stop();
    else void stopAndReview();
  }

  function deleteDraft() {
    if (draft?.url) URL.revokeObjectURL(draft.url);
    setDraft(null);
  }

  function sendDraft() {
    if (!draft) return;
    const d = draft;
    deleteDraft();
    if (d.text?.trim()) sendText(d.text);
    else if (d.blob) void sendAudio(d.blob);
  }

  /** Recording without browser speech recognition: the AI transcribes it once the learner sends. */
  async function stopAndReview() {
    setRecording(false);
    const blob = await stopCapture();
    if (discard.current) {
      discard.current = false;
      return;
    }
    const loud = blob ? await audioPeak(blob) : 0;
    if (blob && (loud < 0 || loud > 0.02)) setDraft({ blob, url: URL.createObjectURL(blob) });
    else setError(noSoundMessage());
  }

  async function toggleMic() {
    const Ctor = speechRecognition();
    // Choosing a specific microphone uses the recorder, because speech recognition cannot pick a device.
    if (Ctor && !deviceId) {
      if (recording) recog.current?.stop();
      else startLiveSpeech(Ctor);
      return;
    }
    if (recording) {
      void stopAndReview();
      return;
    }
    viaRecognition.current = false;
    discard.current = false;
    setError("");
    setRecording(true);
    await startCapture();
  }

  async function finish() {
    if (!sessionId) return router.push("/app/scenarios");
    await fetch(`/api/sessions/${sessionId}/finish`, { method: "POST" });
    router.push(`/app/sessions/${sessionId}`);
  }

  const visual = props.scenarioId != null ? categoryVisual(props.category, props.title) : null;
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
            {props.nativeLanguage && props.nativeLanguage !== props.language && (
              <button
                type="button"
                onClick={() => setShowNative((v) => !v)}
                aria-pressed={showNative}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                {props.nativeLanguage}: {showNative ? "on" : "off"}
              </button>
            )}
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
                    {showNative && m.translation && (
                      <p className="mt-1.5 border-t pt-1.5 text-[0.8rem] leading-relaxed whitespace-pre-wrap text-muted-foreground">{m.translation}</p>
                    )}
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
                    {m.targetVersion && (
                      <p className="mt-1.5 border-t border-white/30 pt-1.5 text-[0.8rem] leading-relaxed">
                        In {props.language}: <b>{m.targetVersion}</b>
                      </p>
                    )}
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
            {limitHit && <LimitModal used={limitHit.used} limit={limitHit.limit} onClose={() => setLimitHit(null)} />}
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
            {recording && (
              <div className="mx-auto mb-3 max-w-xl">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-success transition-[width] duration-75" style={{ width: `${Math.min(100, level * 300)}%` }} />
                </div>
                {noSignal && (
                  <p className="mt-1.5 text-center text-xs text-destructive" role="status">
                    No sound detected. Check your microphone input device.
                  </p>
                )}
              </div>
            )}
            {draft && (
              <div className="mx-auto mb-4 max-w-xl rounded-xl border bg-background p-3">
                {draft.url && <audio controls src={draft.url} className="mb-2 h-9 w-full" />}
                {draft.text !== undefined ? (
                  <textarea
                    value={draft.text}
                    onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                    rows={2}
                    aria-label="What I heard. You can edit it before sending."
                    className={`${inputClass} text-sm`}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Recording ready. The AI will transcribe it when you send.</p>
                )}
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={deleteDraft} className="btn secondary flex items-center gap-1.5 px-3 text-sm">
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                  <button type="button" onClick={sendDraft} disabled={busy} className="btn flex items-center gap-1.5 px-4 text-sm">
                    <Send size={14} aria-hidden="true" /> Send
                  </button>
                </div>
              </div>
            )}
            {recording && interim && (
              <p className="mx-auto mb-3 max-w-xl rounded-xl border bg-background px-4 py-2 text-center text-sm" aria-live="polite">
                {interim}
              </p>
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
                disabled={busy || !!draft}
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
              {recording ? (
                <button
                  type="button"
                  onClick={cancelRecording}
                  aria-label="Cancel recording"
                  className="flex h-11 w-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              ) : (
                <span className="h-11 w-11" aria-hidden="true" />
              )}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {recording ? "Tap to stop, then review and send" : "Tap the microphone to speak"}
            </p>
            {props.nativeLanguage && props.language && props.nativeLanguage !== props.language && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs" role="group" aria-label="Language you speak">
                <span className="text-muted-foreground">I speak:</span>
                {[
                  { label: props.language, native: false },
                  { label: props.nativeLanguage, native: true },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    disabled={recording}
                    aria-pressed={speakNative === o.native}
                    onClick={() => setSpeakNative(o.native)}
                    className={`rounded-full border px-3 py-1 font-medium transition-colors disabled:opacity-50 ${
                      speakNative === o.native ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {props.nativeLanguage && props.language && props.nativeLanguage === props.language && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Your native language is also {props.language}, so translations are off.{" "}
                <Link href="/app/profile" className="font-medium text-primary hover:underline">Change it in Profile</Link>
              </p>
            )}
            {devices.length > 0 && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                <label htmlFor="mic-device" className="text-muted-foreground">Microphone:</label>
                <select
                  id="mic-device"
                  value={deviceId}
                  disabled={recording}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="max-w-56 rounded-lg border bg-background px-2 py-1"
                >
                  <option value="">Browser default (live text)</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            )}

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
