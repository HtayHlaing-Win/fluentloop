# FluentLoop

Practise speaking a new language with an AI conversation partner. Spoken scenarios and Free Talk personas, live feedback, SM-2 flashcards, a progress dashboard and an admin portal.

**Stack:** Next.js 14 (App Router, TypeScript) · Supabase (Postgres, Auth, Row Level Security) · Google Gemini (conversation, feedback, speech-to-text) · ElevenLabs (optional voice) · Recharts

## Features

| Learner | Admin |
|---|---|
| Email sign-up with target language and CEFR level | Overview KPIs and level distribution |
| Scenario library with category filter and search | Learner management: reset allowance, free/pro, delete |
| Spoken or typed conversation turns | Scenario Studio: create, hide, delete scenarios |
| Live grammar / pronunciation / vocabulary feedback | Session replays with per-turn feedback |
| Lesson summary, corrections, new words | |
| Free Talk with 4 personas | |
| SM-2 spaced-repetition flashcards | |
| Dashboard: streak, 7-day trend, history | |

## Setup

You need Node 18.18+ and free accounts at [Supabase](https://supabase.com) and [Google AI Studio](https://aistudio.google.com/app/apikey). ElevenLabs is optional.

```bash
git clone <this repo>
cd fluentloop
npm install
cp .env.example .env.local     # then fill in your keys
```

1. **Database:** in the Supabase dashboard open **SQL Editor**, paste all of `supabase/schema.sql` and run it. It creates the tables, RLS policies, the signup trigger and 9 starter scenarios.
2. **Auth:** for quick local testing, turn off **Authentication → Providers → Email → Confirm email** (otherwise sign-ups must click an email link first).
3. **Run:** `npm run dev` and open http://localhost:3000.
4. **Make yourself admin:** register, then run in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   An **Admin** link appears in the nav.

Use Chrome or Edge for microphone input. `localhost` is allowed over HTTP; deployed sites need HTTPS.

## Deploy (free)

Push to GitHub, import the repo into [Vercel](https://vercel.com), add the same environment variables from `.env.example`, and deploy.

## How a turn works

`POST /api/sessions/[id]/turn` (`src/lib/pipeline.ts`):

1. Confirm the session belongs to the user (database RLS).
2. Atomically check and increment the daily allowance (`consume_turn` SQL function).
3. Transcribe audio with Gemini (text turns skip this).
4. Load the last 10 turns as context.
5. One Gemini call returns the in-character reply **and** the feedback JSON.
6. Generate voice (ElevenLabs, or the browser's speech synthesis) while saving the turn.
7. Add new vocabulary to flashcards and update the running session score.

If `GEMINI_API_KEY` is missing or every model fails, the app returns a clearly labelled demo reply, so it never breaks a demo. The UI tells the learner when this happens.

## Security notes

- API keys stay on the server; only the Supabase URL and anon key reach the browser.
- Every table has RLS. Learners can only update `display_name`, `target_language` and `level` on their own profile (column-level grants), so they cannot grant themselves admin or a higher limit.
- The service-role client is used only in server code, after an admin check.
- Recordings are **not stored**; audio is sent to Gemini for transcription and discarded. Transcripts are kept.
- Pronunciation score is an **estimate from the transcript**, not a phonetic assessment. For real pronunciation scoring, integrate a speech-assessment API (for example Azure Speech).

## Ideas for next steps

- Stream replies for lower latency, or move to a realtime voice API
- Background queue for TTS and feedback
- Real payments for the Pro plan (replace the admin toggle)
- UI localisation, learner data export and deletion
- Tests for `sm2`, the pipeline and the admin guard
