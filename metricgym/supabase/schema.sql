-- METRICGYM schema — Postgres (Supabase), EU region (see README).
--
-- Conventions:
--   * All PKs are CLIENT-GENERATED UUIDv7 (offline-first contract:
--     idempotent upserts on PK, last-write-wins via updated_at).
--   * user_id is DENORMALIZED onto workout_sets, meals, checkins so every
--     RLS policy is a single-column check — join-based RLS murders query
--     performance.
--   * Exercises are CODE-DEFINED (lib/data/exercises.ts) with stable
--     string ids; exercise_id columns are intentionally FK-less.
--   * Indexes are plain btree. NO partitioning, NO BRIN at MVP scale —
--     do not over-engineer this before millions of rows per user.

create extension if not exists "pgcrypto";

-- updated_at trigger (kept simple; clients send updated_at themselves,
-- the trigger only guards against missing values).
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = coalesce(new.updated_at, now());
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  units text not null default 'kg' check (units in ('kg', 'lbs')),
  locale text not null default 'de',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profiles_own on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_updated before insert or update on profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------- assessments
-- Raw quiz JSON + computed output, versioned for forward migrations.
create table assessments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  schema_version int not null,
  raw_input jsonb not null,
  computed_output jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table assessments enable row level security;
create policy assessments_own on assessments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index assessments_user_created on assessments (user_id, created_at desc);
create trigger assessments_updated before insert or update on assessments
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------- plans
create table plans (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mesocycle jsonb not null,
  started_at timestamptz not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table plans enable row level security;
create policy plans_own on plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index plans_user_started on plans (user_id, started_at desc);
create trigger plans_updated before insert or update on plans
  for each row execute function set_updated_at();

-- --------------------------------------------------------------- plan_days
-- Normalized day rows for future server-side querying. The client keeps
-- the mesocycle JSON authoritative at MVP; this table is populated lazily.
create table plan_days (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references plans (id) on delete cascade,
  week_index int not null,
  day_index int not null,
  label text not null,
  exercises jsonb not null,
  updated_at timestamptz not null default now()
);
alter table plan_days enable row level security;
create policy plan_days_own on plan_days for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index plan_days_plan on plan_days (plan_id, week_index, day_index);
create trigger plan_days_updated before insert or update on plan_days
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- workouts
create table workouts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references plans (id) on delete set null,
  week_index int not null default 0,
  day_index int not null default 0,
  label text not null default '',
  started_at timestamptz not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table workouts enable row level security;
create policy workouts_own on workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index workouts_user_started on workouts (user_id, started_at desc);
create trigger workouts_updated before insert or update on workouts
  for each row execute function set_updated_at();

-- ------------------------------------------------------------ workout_sets
-- user_id denormalized: single-column RLS check (no join through workouts).
create table workout_sets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null references workouts (id) on delete cascade,
  exercise_id text not null, -- stable string id into lib/data/exercises.ts (no FK by design)
  set_index int not null,
  weight_kg numeric(6, 2) not null,
  reps int not null,
  rpe numeric(3, 1),
  is_warmup boolean not null default false,
  completed_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table workout_sets enable row level security;
create policy workout_sets_own on workout_sets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index workout_sets_user_completed on workout_sets (user_id, completed_at desc);
create index workout_sets_workout on workout_sets (workout_id, set_index);
create index workout_sets_user_exercise on workout_sets (user_id, exercise_id, completed_at desc);
create trigger workout_sets_updated before insert or update on workout_sets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- checkins
create table checkins (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2),
  sleep_quality int check (sleep_quality between 1 and 5),
  soreness int check (soreness between 1 and 5),
  stress int check (stress between 1 and 5),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table checkins enable row level security;
create policy checkins_own on checkins for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- unique (user_id, date) doubles as the lookup index
create trigger checkins_updated before insert or update on checkins
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------- meals
create table meals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  eaten_at timestamptz not null,
  name text not null,
  kcal int not null,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  updated_at timestamptz not null default now()
);
alter table meals enable row level security;
create policy meals_own on meals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index meals_user_eaten on meals (user_id, eaten_at desc);
create trigger meals_updated before insert or update on meals
  for each row execute function set_updated_at();

-- -------------------------------------------------------- readiness_scores
create table readiness_scores (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  score int not null check (score between 0 and 100),
  tier text not null check (tier in ('primed', 'ready', 'caution', 'recover')),
  calibrating boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table readiness_scores enable row level security;
create policy readiness_scores_own on readiness_scores for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger readiness_scores_updated before insert or update on readiness_scores
  for each row execute function set_updated_at();

-- ---------------------------------------------------------- weekly_reports
-- Computed on read by the client, cached here.
create table weekly_reports (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
alter table weekly_reports enable row level security;
create policy weekly_reports_own on weekly_reports for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger weekly_reports_updated before insert or update on weekly_reports
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- consents
-- GDPR: medical disclaimer (PAR-Q gate) + Art. 9 AI-coach data sharing.
create table consents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('medical_disclaimer', 'ai_coach_gdpr')),
  granted boolean not null,
  granted_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);
alter table consents enable row level security;
create policy consents_own on consents for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger consents_updated before insert or update on consents
  for each row execute function set_updated_at();
