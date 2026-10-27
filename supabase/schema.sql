-- FluentLoop database schema. Run once in the Supabase SQL Editor.

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Learner',
  target_language text not null default 'Spanish',
  level text not null default 'A1',
  plan text not null default 'free',
  role text not null default 'user' check (role in ('user','admin')),
  daily_turn_limit int default 20,          -- null = unlimited
  daily_turns_used int not null default 0,
  last_turn_reset date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.scenarios (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null default 'Daily Life',
  difficulty text not null default 'A1',
  description text not null default '',
  system_prompt text not null,
  duration_min int not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id bigint references public.scenarios(id) on delete set null,
  persona text,
  language text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  overall_score int
);
create index if not exists sessions_user_started_idx on public.sessions (user_id, started_at desc);

create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_transcript text not null,
  ai_text text not null,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists turns_session_created_idx on public.turns (session_id, created_at);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word text not null,
  translation text not null default '',
  example text not null default '',
  language text not null,
  next_review timestamptz not null default now(),
  interval_days int not null default 0,
  ease real not null default 2.5,
  repetitions int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, language, word)
);
create index if not exists flashcards_due_idx on public.flashcards (user_id, language, next_review);

-- ---------- Helpers ----------
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile whenever someone signs up (values come from signUp metadata).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, target_language, level)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'target_language', ''), 'Spanish'),
    coalesce(nullif(new.raw_user_meta_data->>'level', ''), 'A1')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic daily allowance check + increment (no lost updates under concurrency).
create or replace function public.consume_turn(p_user uuid)
returns table (allowed boolean, used int, lim int)
language plpgsql security definer set search_path = public as $$
declare r public.profiles%rowtype;
begin
  update public.profiles
     set daily_turns_used = case when last_turn_reset < current_date then 0 else daily_turns_used end,
         last_turn_reset = current_date
   where id = p_user;

  update public.profiles
     set daily_turns_used = daily_turns_used + 1
   where id = p_user
     and (daily_turn_limit is null or daily_turns_used < daily_turn_limit)
  returning * into r;

  if found then
    return query select true, r.daily_turns_used, r.daily_turn_limit;
  else
    select * into r from public.profiles where id = p_user;
    return query select false, coalesce(r.daily_turns_used, 0), r.daily_turn_limit;
  end if;
end $$;

revoke all on function public.consume_turn(uuid) from public, anon, authenticated;
grant execute on function public.consume_turn(uuid) to service_role;

-- ---------- Row Level Security (every table) ----------
alter table public.profiles   enable row level security;
alter table public.scenarios  enable row level security;
alter table public.sessions   enable row level security;
alter table public.turns      enable row level security;
alter table public.flashcards enable row level security;

-- profiles: read own (or any if admin). Users may only edit safe columns (see grants).
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select
  using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from authenticated, anon;
grant update (display_name, target_language, level) on public.profiles to authenticated;

-- scenarios: everyone signed in reads active ones; admins manage all.
drop policy if exists "scenarios read" on public.scenarios;
create policy "scenarios read" on public.scenarios for select
  using (is_active or public.is_admin());
drop policy if exists "scenarios admin write" on public.scenarios;
create policy "scenarios admin write" on public.scenarios for all
  using (public.is_admin()) with check (public.is_admin());

-- sessions
drop policy if exists "sessions own" on public.sessions;
create policy "sessions own" on public.sessions for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- turns: through the owning session
drop policy if exists "turns own" on public.turns;
create policy "turns own" on public.turns for all
  using (exists (select 1 from public.sessions s
                 where s.id = turns.session_id and (s.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.sessions s
                      where s.id = turns.session_id and s.user_id = auth.uid()));

-- flashcards
drop policy if exists "flashcards own" on public.flashcards;
create policy "flashcards own" on public.flashcards for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ---------- Default scenarios ----------
insert into public.scenarios (title, category, difficulty, description, system_prompt, duration_min)
select * from (values
  ('Ordering at a Restaurant', 'Daily Life', 'A1', 'Order a meal, ask about the menu and pay the bill.',
   'You are a friendly waiter in a busy restaurant. Take the learner''s order, answer questions about dishes and handle the bill.', 5),
  ('Buying Groceries', 'Daily Life', 'A2', 'Ask for items, quantities and prices at a market.',
   'You are a shopkeeper at a local market. Help the learner find items, give prices and make small talk.', 5),
  ('Asking for Directions', 'Travel', 'A1', 'Find your way to a station, hotel or landmark.',
   'You are a helpful local. The learner is lost and needs directions. Give simple, clear directions.', 4),
  ('Checking into a Hotel', 'Travel', 'A2', 'Check in, ask about breakfast and report a problem.',
   'You are a hotel receptionist. Check the learner in, explain facilities and handle any request politely.', 6),
  ('Job Interview', 'Business', 'B1', 'Answer common interview questions about experience and goals.',
   'You are a hiring manager interviewing the learner for a role. Ask realistic questions and follow up on their answers.', 8),
  ('Meeting a New Colleague', 'Business', 'B1', 'Introduce yourself and talk about your work.',
   'You are a new colleague meeting the learner for the first time. Be friendly and ask about their role and background.', 5),
  ('Making Friends at a Party', 'Social', 'A2', 'Small talk about hobbies, music and weekend plans.',
   'You are a friendly guest at a party. Chat casually with the learner about hobbies and interests.', 5),
  ('Visiting a Doctor', 'Emergency', 'B1', 'Describe symptoms and understand advice.',
   'You are a calm doctor. Ask the learner about their symptoms and give simple advice. This is a language exercise, not real medical advice.', 6),
  ('Lost Wallet', 'Emergency', 'B1', 'Report a lost item to the police or station staff.',
   'You are a station officer. The learner lost their wallet. Ask for a description, when and where it happened, and contact details.', 6)
) as v(title, category, difficulty, description, system_prompt, duration_min)
where not exists (select 1 from public.scenarios);

-- To make yourself an admin (replace the email):
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
