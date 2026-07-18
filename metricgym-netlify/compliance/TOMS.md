# Technische & organisatorische Maßnahmen (Art. 32 DSGVO) — METRICGYM

Stand: Juli 2026

## Zugriffskontrolle & Autorisierung
- **Row Level Security (RLS)** auf allen Supabase-Tabellen: `user_state`,
  `consent_log`, `subscriptions` (read-only für Nutzer), `referrals`,
  `ai_usage`/`elite_accounts` (keine Client-Policies — nur Service-Role).
  SQL versioniert in `SUPABASE_SETUP.md`.
- **Service-Role-Key ausschließlich serverseitig** (Edge Functions
  `ai-proxy`, `delete-account`) — niemals im Client-Bundle.
- Abo-Tier wird serverseitig bestimmt (`my_tier()`-RPC); Client-Werte sind
  nur Cache und werden beim Boot resynct.
- KI-Proxy erzwingt JWT-Authentifizierung + Tages-Rate-Limits pro Nutzer.

## Übertragungs- & Speicherverschlüsselung
- TLS für alle Verbindungen (Netlify/Supabase erzwingen HTTPS; HSTS-Header
  gesetzt, siehe `_headers`).
- Supabase: Verschlüsselung at rest (Anbieter-Standard, AES-256).
- Passwörter: bcrypt-Hashing durch Supabase Auth (nie Klartext); lokale
  Konten speichern einen Hash, nie das Passwort.

## Datenminimierung & Pseudonymisierung
- **Local-first-Architektur**: Ohne Cloud-Konto verlassen keine Daten das
  Gerät („Ohne Cloud starten": nur Vorname, keine E-Mail).
- KI-Kontext ist minimiert: Alter/Ziele/Kennzahlen, **nie Name oder
  E-Mail** (`aiContext()`); Open Food Facts erhält nur Suchbegriff/Barcode.
- Fortschrittsfotos bleiben ausschließlich lokal (IndexedDB).

## Client-Sicherheit
- Content-Security-Policy (siehe `_headers`): `default-src 'self'`,
  `connect-src` auf Supabase/KI-Hosts/Open Food Facts begrenzt,
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, restriktive
  Permissions-Policy (Kamera/Mikrofon nur self, kein Geolocation).
- Alle fremden Strings (Open-Food-Facts-Produktnamen, CSV-Import,
  Nutzereingaben) werden vor dem Rendern mit `esc()` escaped.
- `config.js` wird nie gecacht (`Cache-Control: no-store`) — Key-Rotation
  greift sofort.

## Verfügbarkeit & Wiederherstellung
- Supabase-Backups (Anbieter-Standard, PITR je nach Plan — [BETREIBER]:
  Plan mit Point-in-Time-Recovery wählen und hier dokumentieren).
- Local-first: App bleibt bei Server-Ausfall voll funktionsfähig
  (Service-Worker-Offline-Shell, Daten auf dem Gerät).

## Lösch- & Widerrufskonzept
- Konto-Löschung: Edge Function löscht alle Server-Tabellen + Auth-User;
  Client löscht localStorage + beide IndexedDB-Datenbanken. Sofort, ohne
  Kulanzfrist.
- Widerruf Art. 9: sofortiger Stopp von Cloud-Sync und KI-Verarbeitung
  (technisch erzwungen in `SB.push`/`aiActive`), protokolliert.

## Organisatorisches ([BETREIBER])
- Zugriff auf Supabase-Dashboard/Netlify auf notwendige Personen begrenzen,
  2FA aktivieren.
- Secrets (API-Keys) nur in Supabase-Secrets/Netlify-Env — nie im Repo.
- Änderungen an Rechtstexten über `LEGAL_VERSION` versionieren (Re-Consent
  erzwingt Kenntnisnahme).
