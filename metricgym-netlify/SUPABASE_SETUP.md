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

## 3b. Google-Login aktivieren (WICHTIG — sonst „Timeout/Error")
Der „Mit Google fortfahren"-Button funktioniert NUR, wenn beides eingerichtet ist:
1. **Google Cloud Console** → APIs & Dienste → Anmeldedaten → **OAuth-Client-ID** (Typ: Webanwendung) erstellen.
   - **Autorisierte Weiterleitungs-URI** eintragen:
     `https://DEINPROJEKT.supabase.co/auth/v1/callback`
   - `Client ID` und `Client Secret` kopieren.
2. **Supabase → Authentication → Providers → Google**: aktivieren, Client ID + Secret einfügen, speichern.
3. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: deine Deploy-Domain, z. B. `https://deine-app.netlify.app`
   - **Redirect URLs** (hinzufügen): deine Deploy-Domain **inkl. Pfad**, z. B.
     `https://deine-app.netlify.app/` und `https://deine-app.netlify.app/index.html`
     (Die App kehrt zu `origin + pfad` zurück — diese URL muss freigegeben sein, sonst Fehler.)

Ohne Schritt 1–3 schlägt Google-Login fehl (Provider nicht aktiv / Redirect nicht erlaubt).
Die App nutzt den **Implicit-Flow** mit `detectSessionInUrl` — kein Backend nötig, die Session
wird beim Rücksprung automatisch aus der URL erkannt. E-Mail/Passwort-Login funktioniert immer
auch ohne Google.

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

## Alle Konten zurücksetzen (vor dem Launch)

Der Anon-Key im Client kann fremde Konten NICHT löschen (RLS) — das geht nur
im Supabase-Dashboard (https://supabase.com/dashboard → Projekt):

1. **Gespeicherte App-Daten löschen** — SQL Editor:
   ```sql
   truncate table public.user_state;
   ```
2. **Auth-Konten löschen** — SQL Editor (löscht ALLE Logins!):
   ```sql
   delete from auth.users;
   ```
   (alternativ einzeln unter Authentication → Users)

Danach ist die Datenbank leer wie am ersten Tag. Lokale Gerätedaten der
Tester löschen sich über Profil → „Konto & Daten endgültig löschen" oder
Browser-Daten der Seite entfernen.

## Dauerhafte ELITE-Konten

In `config.js` unter `eliteAccounts` gepflegt (z. B. Gründer/Familie):
beim Login oder App-Start wird das Konto automatisch auf ELITE gesetzt.

## 4. Abo-Tier serverseitig (Pflicht für Launch — verhindert DevTools-Freischaltung)

```sql
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
```

Gründer-Konto eintragen:
```sql
insert into elite_accounts (email, note) values ('lovisstumpfe@icloud.com', 'Gründer')
on conflict (email) do nothing;
```
`config.js → eliteAccounts` ist damit **veraltet** (wird nicht mehr gelesen).

## 5. ai-proxy deployen (JWT-Pflicht + Tier-Limits)

Der Quellcode liegt im Repo: `supabase/functions/ai-proxy/index.ts`.

```bash
supabase functions deploy ai-proxy
supabase secrets set CEREBRAS_API_KEY=... GROQ_API_KEY=... \
                     GEMINI_API_KEY=... OPENROUTER_API_KEY=...
```

Es genügt **ein** Schlüssel — die Kette überspringt jeden Anbieter ohne Key.
Keiner dieser Werte gehört jemals in `config.js`: diese Datei wird beim Deploy
öffentlich ausgeliefert.

Verhalten: ohne gültiges Nutzer-JWT → 401 · Tageslimits FREE 5 / PRO 60 /
ELITE 200 (Tabelle `ai_usage`) → 429 mit deutscher Meldung, die die App
direkt anzeigt.

**Provider-Kette**
- Text & Streaming: Cerebras → Groq → OpenRouter (Gemini im `complete`-Modus
  nach Cerebras)
- Bilderkennung (`vision`): **nur Gemini** — Cerebras, Groq und OpenRouter
  haben in dieser Anbindung keinen Bild-Eingang. Ohne `GEMINI_API_KEY` bleibt
  die Foto-Erkennung inaktiv, alles andere läuft.

**Warum Cerebras zuerst** (gemessen, je 3 Läufe, gleicher Prompt):

| Anbieter · Modell | Antwortzeit | JSON-Modus |
|---|---|---|
| Cerebras `gemma-4-31b` | ⌀ 599 ms | valide |
| Cerebras `gpt-oss-120b` | ⌀ 660 ms | **leer** — Reasoning frisst das Budget |
| Groq `llama-3.3-70b-versatile` | ⌀ 1.147 ms | valide |

Das Standardmodell ist deshalb `gemma-4-31b` (überschreibbar via
`CEREBRAS_MODEL`). Ein Reasoning-Modell hier nur mit deutlich höherem
`max_tokens` setzen, sonst liefert die Ernährungs-Erkennung leere Antworten.
Das SSE-Format von Cerebras ist identisch zu OpenAI
(`choices[0].delta.content`) — kein eigener Adapter nötig.

Hinweis Trial: Der lokale 7-Tage-Test schaltet die App-Ansichten frei; die
Server-Limits folgen dem Server-Tier. Mit Stripe (Roadmap D4) wird der Trial
als `status='trialing'` serverseitig geführt und beides ist deckungsgleich.

## 6. Einwilligungs-Log (C2 — Art. 7 Abs. 1 DSGVO)

Einwilligungen müssen NACHWEISBAR sein. Die App schreibt jede Erteilung und
jeden Widerruf (offline-tolerant, Warteschlange) in `consent_log`:

```sql
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
```

Hinweis: Bei einer Änderung der Rechtstexte `LEGAL_VERSION` in `index.html`
erhöhen — die App zeigt dann automatisch das Re-Consent-Sheet; Ablehnen
schaltet in den Nur-Basis-Modus (kein Rauswurf).

## 7. delete-account deployen (C3 — Art. 17)

```bash
supabase functions deploy delete-account
```

Die Funktion löscht für den ANGEMELDETEN Nutzer: `user_state`, `consent_log`,
`subscriptions`, `ai_usage`, `referrals` (als Geworbener) und zuletzt den
Auth-User selbst (`auth.admin.deleteUser`). Der Service-Role-Key bleibt
ausschließlich serverseitig. Der Client ruft sie über
`SB.client.functions.invoke("delete-account")` auf; scheitert der Aufruf,
löscht die App trotzdem lokal und sagt das ehrlich ([BETREIBER]: Funktion
deployen, sonst bleibt die Server-Löschung auf `user_state` beschränkt).

## 8. RLS-Review (C6) — Soll-Zustand aller Tabellen

| Tabelle | Client-Policies | Begründung |
|---|---|---|
| `user_state` | select/insert/update/delete nur `auth.uid() = user_id` | der eigene Zustands-Blob |
| `consent_log` | insert + select nur eigene Zeilen; KEIN update/delete | unveränderliches Nachweis-Log |
| `subscriptions` | NUR select eigene Zeile | Tier wird ausschließlich serverseitig geschrieben (Stripe-Webhook/Betreiber) |
| `elite_accounts` | KEINE Client-Policies | nur Service-Role (my_tier RPC liest security definer) |
| `ai_usage` | KEINE Client-Policies | nur ai-proxy (Service-Role) zählt |
| `referrals` | insert eigene referee-Zeile; select nur aggregiert via RPC | keine Fremddaten lesbar |

Prüfen: Supabase Dashboard → Authentication → Policies — jede Tabelle muss
RLS „enabled" zeigen; jede fehlende Zeile oben ist ein Launch-Blocker.

## 9. Auth-Flow: bewusst `implicit` (Stand Juli 2026)

supabase-js v2 kann PKCE auch ohne eigenes Backend. Wir bleiben VORERST bei
`flowType:"implicit"`, weil der Passwort-Reset-Flow (C1) auf den
`#access_token…type=recovery`-Hash aufbaut und ein Wechsel auf PKCE die
Link-Formate ändert (`?code=` + `exchangeCodeForSession`). Umstellung ist
vorbereitet, braucht aber einen Test gegen das echte Projekt:
1. `flowType:"pkce"` in `SB.init` setzen,
2. Boot-Code auf `?code=`-Erkennung + `exchangeCodeForSession` erweitern,
3. Reset-/OAuth-Flows einmal real durchklicken. [BETREIBER]

## 10. Stripe anschließen (D4) [BETREIBER]

1. **Produkte/Preise** im Stripe-Dashboard anlegen:
   PRO 9,99 €/Monat + 79,99 €/Jahr, ELITE 19,99 €/Monat + 159,99 €/Jahr
   (wiederkehrend, Steuer nach Bedarf). Die vier `price_...`-IDs notieren.
2. **Functions deployen & Secrets setzen**:
   ```bash
   supabase functions deploy create-checkout
   supabase functions deploy create-portal
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... \
     STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://deine-domain.tld \
     STRIPE_PRICE_PRO_MONTHLY=price_... STRIPE_PRICE_PRO_YEARLY=price_... \
     STRIPE_PRICE_ELITE_MONTHLY=price_... STRIPE_PRICE_ELITE_YEARLY=price_...
   ```
3. **Webhook** in Stripe: Endpoint = URL der Function `stripe-webhook`,
   Events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Kundenportal in Stripe aktivieren
   (Billing → Customer portal), Kündigen erlauben.
4. `config.js → stripeEnabled: true` setzen. Ab dann: Upgrade-Button öffnet
   die echte Kasse (7-Tage-Trial), „Verträge hier kündigen" öffnet das
   Stripe-Portal, der Webhook pflegt `subscriptions` → `my_tier()` liefert
   den bezahlten Tier, die App resynct beim Boot (C4).
