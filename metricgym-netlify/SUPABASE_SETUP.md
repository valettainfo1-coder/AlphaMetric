# METRICGYM — Supabase Cloud-Sync (pro Konto)

Die App ist **local-first**: Ohne Supabase-Keys läuft alles lokal (localStorage) weiter.
Sobald `supabaseUrl` + `supabaseAnonKey` in `config.js` gesetzt sind, werden Konten und
Daten **pro Nutzer in der Cloud** gespeichert und geräteübergreifend synchronisiert.

## 1. Supabase-Projekt anlegen
1. Auf https://supabase.com ein kostenloses Projekt erstellen.
2. **Project Settings → API**: `Project URL` und den `anon`/`public` Key kopieren.
3. In `config.js` eintragen:
   ```js
   supabaseUrl: "https://DEINPROJEKT.supabase.co",
   supabaseAnonKey: "eyJ...dein-anon-key..."
   ```

## 2. Tabelle + Sicherheit (SQL-Editor → ausführen)
```sql
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
```
Row-Level-Security stellt sicher, dass **jeder Nutzer nur seine eigene Zeile** sehen/ändern kann —
auch mit dem öffentlichen anon-Key.

## 2b. Empfehlungsprogramm (optional — „Freunde werben")
Für geräteübergreifend **bestätigte** Einladungen eine kleine Tabelle + Zählfunktion anlegen.
Einstufig & datensparsam: gespeichert wird nur, wer von welchem Code geworben wurde.
```sql
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
```
Ohne diese Tabelle läuft die App normal weiter — der Werber-Zähler bleibt dann bei 0.

## 3. Auth-Einstellungen
- **Authentication → Providers → Email**: aktiv.
- **E-Mail-Bestätigung**: Standardmäßig an. Dann muss der Nutzer nach der Registrierung
  seine E-Mail bestätigen, bevor er sich anmelden kann (die App zeigt den Hinweis).
  Für einen reibungslosen Demo-/Test-Flow kann „Confirm email" temporär deaktiviert werden.
- (Optional) **URL Configuration**: deine Deploy-Domain als Site-URL eintragen.

## Wie es funktioniert
- **Registrierung** → Supabase-Auth (sicheres Passwort-Hashing, Sessions); Vorname als Metadaten.
- **Login** → lädt die `user_state.data` des Kontos und füllt den App-State (Hydrate).
- **Speichern** → jeder `save()` schreibt den State debounced als ein `jsonb` in die eigene Zeile (Upsert).
- **Auto-Login** → bestehende Session wird beim Start wiederhergestellt (geräteübergreifend).
- **Konflikte**: Last-Write-Wins über `updated_at`.

## Produktions-Hinweise
- **Groq-Key** nicht im Client lassen: vor öffentlichem Launch über einen Server-Proxy
  (z. B. Supabase Edge Function) routen und rotieren.
- DSGVO: Konto-Löschung serverseitig = Zeile in `user_state` + `auth.users`-Eintrag löschen
  (per `on delete cascade` reicht das Löschen des Auth-Users).
