/**
 * ElevenLabs text-to-speech. Returns a data URL, or null when no key is configured
 * or the request fails (the browser then falls back to speechSynthesis).
 */
export async function synthesize(text: string): Promise<string | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !text) return null;
  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) {
      console.warn(`[tts] ElevenLabs HTTP ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:audio/mpeg;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.warn("[tts] failed:", (err as Error).message);
    return null;
  }
}
