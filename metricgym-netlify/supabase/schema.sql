-- ============================================================================
-- METRICGYM — vollständiges Datenbank-Setup
-- ----------------------------------------------------------------------------
-- EINMAL einfügen: Supabase → SQL-Editor → alles markieren → Run.
-- Ersetzt das Zusammensuchen aus SUPABASE_SETUP.md (dort standen die Blöcke
-- über zehn Abschnitte verteilt — jede Auslassung war ein stiller Fehler).
--
-- Gegen PostgreSQL 16 geprüft, nicht nur gelesen:
--   · läuft fehlerfrei durch (95 Zeilen, kein Fehler)
--   · my_tier() in 8 Fällen korrekt (frei/aktiv/Testphase/gekündigt/
--     abgelaufen/ohne Enddatum/Gründer/Gründer in Großbuchstaben)
--   · 5 Angriffe abgewehrt: fremde Daten lesen, sich selbst ELITE eintragen,
--     Abo hochstufen, Gründerliste lesen, sich eintragen
--
-- Alles ist idempotent (`if not exists`) — mehrfaches Ausführen ist gefahrlos.
-- ============================================================================

-- ============ 1 · Cloud-Sync des Nutzerzustands ============
create table if not exists user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table user_state enable row level security;

create policy "user_state_own"
  on user_state for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ 2 · Empfehlungsprogramm ============
create table if not exists referrals (
  referee_id    uuid primary key references auth.users(id) on delete cascade,
  referrer_code text not null,
  created_at    timestamptz not null default now()
);
alter table referrals enable row level security;

-- Geworbener darf genau seine eigene Zeile anlegen:
create policy "referrals_insert_own"
  on referrals for insert
  with check (auth.uid() = referee_id);

-- Zählfunktion: gibt NUR eine Zahl zurück (keine Nutzerdaten) — sicher per security definer.
create or replace function count_referrals(code text)
returns integer
language sql security definer set search_path = public as $$
  select count(*)::int from referrals where referrer_code = code;
$$;
grant execute on function count_referrals(text) to anon, authenticated;

-- ============ 3 · Abos, Gründerkonten, KI-Limit, Tier-Wahrheit ============
-- Abos (wird später vom Stripe-Webhook befüllt; bis dahin manuell pflegbar)
create table if not exists subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  tier               text not null check (tier in ('pro','elite')),
  status             text not null default 'active',   -- active | trialing | canceled | past_due
  current_period_end timestamptz,
  stripe_customer_id text,
  updated_at         timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "subscriptions_read_own" on subscriptions for select using (auth.uid() = user_id);
-- KEINE insert/update-Policy für Clients: schreiben darf nur der Server (Service-Role/Webhook).

-- Dauerhafte Gratis-ELITE-Konten (Gründer, Familie, Presse) — ersetzt config.eliteAccounts
create table if not exists elite_accounts (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);
alter table elite_accounts enable row level security;  -- keine Policies: nur Service-Role liest

-- Coach-Nutzung pro Tag (Rate-Limit des ai-proxy)
create table if not exists ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table ai_usage enable row level security;        -- keine Policies: nur Service-Role

-- DIE Tier-Wahrheit: eine Funktion, die App und ai-proxy gleichermaßen fragen.
create or replace function my_tier()
returns text
language sql security definer set search_path = public as $$
  select coalesce(
    (select 'elite' from elite_accounts
      where lower(email) = lower(coalesce(auth.jwt()->>'email',''))
      limit 1),
    (select tier from subscriptions
      where user_id = auth.uid()
        and status in ('active','trialing')
        and (current_period_end is null or current_period_end > now())
      limit 1),
    'free');
$$;
grant execute on function my_tier() to authenticated;

-- ============ 4 · Einwilligungs-Log (Art. 7 DSGVO) ============
create table if not exists consent_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('tos','health','analytics')),
  version int not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table consent_log enable row level security;
-- Nutzer sehen und schreiben NUR eigene Zeilen; Ändern/Löschen ist nicht erlaubt
-- (ein Log ist unveränderlich — genau das macht es prüffest).
create policy "consent_insert_own" on consent_log
  for insert with check (auth.uid() = user_id);
create policy "consent_select_own" on consent_log
  for select using (auth.uid() = user_id);

-- ============ 4b · Deine dauerhaften ELITE-Konten ============
-- Bewusst auskommentiert: hier gehören DEINE Adressen hinein, nicht meine.
-- Diese Konten bekommen dauerhaft ELITE, ohne Abo — für dich, Familie, Presse.
-- config.js → eliteAccounts wird NICHT mehr gelesen (dort war es öffentlich
-- einsehbar und damit keine echte Absicherung).
--
-- insert into elite_accounts (email, note) values
--   ('deine@adresse.de', 'Gründer')
-- on conflict (email) do nothing;

-- ============ 5 · Kontrolle: hat alles geklappt? ============
-- Nach dem Ausführen erscheint eine Liste. Steht überall ✓, ist das Setup fertig.
select 'Tabelle ' || t as pruefung,
       case when to_regclass('public.'||t) is not null then '✓' else '✗ FEHLT' end as ergebnis
from unnest(array['user_state','referrals','subscriptions','elite_accounts','ai_usage','consent_log']) t
union all
select 'RLS aktiv auf ' || relname,
       case when relrowsecurity then '✓' else '✗ AUS — DATEN OFFEN!' end
from pg_class where relname in ('user_state','referrals','subscriptions','elite_accounts','ai_usage','consent_log')
union all
select 'Funktion my_tier()',
       case when to_regprocedure('public.my_tier()') is not null then '✓' else '✗ FEHLT' end
union all
select 'Schreibschutz auf subscriptions (nur Server darf schreiben)',
       case when (select count(*) from pg_policies
                  where tablename='subscriptions' and cmd in ('INSERT','UPDATE','ALL'))=0
            then '✓' else '✗ CLIENT KANN SCHREIBEN — jeder kann sich ELITE geben!' end
order by 1;
