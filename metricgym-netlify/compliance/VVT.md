# Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) — METRICGYM

Stand: Juli 2026 · Verantwortlicher: **[BETREIBER: Name, Anschrift, Kontakt eintragen — identisch mit `config.js → legal`]**

## VT-01 — Konto & Authentifizierung
| | |
|---|---|
| **Zweck** | Registrierung, Login, Passwort-Reset, Konto-Sicherheit |
| **Kategorien betroffener Personen** | Nutzer:innen der App |
| **Datenkategorien** | Vorname, E-Mail-Adresse, Passwort-Hash (bei „Ohne Cloud": nur Vorname, lokal) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 b DSGVO (Vertrag) |
| **Empfänger** | Supabase (Auftragsverarbeiter, EU-Region — siehe AVV-STATUS.md) |
| **Drittland** | nein (Region prüfen und hier eintragen: [BETREIBER]) |
| **Löschfrist** | mit Konto-Löschung (Edge Function `delete-account`, sofort) |
| **TOMs** | TOMS.md (RLS, TLS, Hashing) |

## VT-02 — Trainings-, Ernährungs- & Erholungs-Coaching (Kernfunktion)
| | |
|---|---|
| **Zweck** | Individuelle Trainingspläne, Ernährungsziele, Fortschritts-Analytik |
| **Datenkategorien** | **Gesundheitsdaten (Art. 9)**: Größe, Gewicht, Körpermaße, Trainingslogs, Ernährungslogs, Status-Checks (Schlaf, Energie, Stress), Ruhepuls/HRV (bei Health-Import) |
| **Rechtsgrundlage** | Art. 9 Abs. 2 a DSGVO (ausdrückliche Einwilligung, protokolliert in `consent_log`, widerrufbar in der App) |
| **Empfänger** | Supabase (Sync, nur bei Cloud-Konto); ohne Cloud-Konto: keine — Verarbeitung rein lokal |
| **Löschfrist** | mit Konto-Löschung bzw. sofortiger Verarbeitungsstopp bei Widerruf |

## VT-03 — KI-Coach (Chat, Foto-Analyse, Plan-Import)
| | |
|---|---|
| **Zweck** | Kontextuelle Coaching-Antworten, Lebensmittel-/Plan-Erkennung |
| **Datenkategorien** | Chat-Eingaben, Fotos (Essen/Plan), minimierter Profilkontext (Alter, Ziele, Kennzahlen — **nie Name/E-Mail**; verifiziert in `aiContext()`) — Inhalte können Gesundheitsdaten sein |
| **Rechtsgrundlage** | Art. 9 Abs. 2 a + Art. 49 Abs. 1 a DSGVO (Einwilligung; Funktion ist optional und einzeln aktivierbar) |
| **Empfänger** | über serverseitigen Proxy (`ai-proxy`): Google (Gemini), OpenRouter, Groq — jeweils ggf. USA |
| **Löschfrist** | keine Speicherung der Chats auf unserem Server; Tages-Nutzungszähler (`ai_usage`) tagesbezogen |

## VT-04 — Lebensmittel-Datenbank (Open Food Facts)
| | |
|---|---|
| **Zweck** | Produktsuche & Barcode-Lookup mit echten Nährwerten |
| **Datenkategorien** | NUR Suchbegriff bzw. Barcode — kein Personenbezug, keine Kontodaten |
| **Rechtsgrundlage** | Art. 6 Abs. 1 b DSGVO |
| **Empfänger** | Open Food Facts (openfoodfacts.org, EU-Projekt) |
| **Löschfrist** | lokaler Cache 30 Tage (IndexedDB, Gerät) |

## VT-05 — Einwilligungs-Protokoll
| | |
|---|---|
| **Zweck** | Nachweis der Einwilligungen (Art. 7 Abs. 1) |
| **Datenkategorien** | Art der Einwilligung, Dokument-Version, Zeitpunkt Erteilung/Widerruf |
| **Rechtsgrundlage** | Art. 6 Abs. 1 c DSGVO (Nachweispflicht) |
| **Empfänger** | Supabase (`consent_log`, RLS: nur eigene Zeilen, unveränderlich) |
| **Löschfrist** | mit Konto-Löschung |

## VT-06 — Hosting & Auslieferung
| | |
|---|---|
| **Zweck** | Bereitstellung der Web-App |
| **Datenkategorien** | technische Server-Logs (IP, User-Agent, Zeitpunkt) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 f DSGVO (berechtigtes Interesse: Betrieb/Sicherheit) |
| **Empfänger** | Netlify (Auftragsverarbeiter) |
| **Löschfrist** | gemäß Netlify-Log-Retention (kurzfristig) |

## VT-07 — Empfehlungsprogramm
| | |
|---|---|
| **Zweck** | Einstufiges Referral (Gutschrift bei geworbenen zahlenden Nutzern) |
| **Datenkategorien** | Referral-Code, Zuordnung Werber↔Geworbener (IDs) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 b DSGVO |
| **Empfänger** | Supabase (`referrals`) |
| **Löschfrist** | mit Konto-Löschung |

**Nicht verarbeitet:** Tracking-/Werbe-Cookies, Standortdaten, Kontakte.
**Nur lokal (verlassen das Gerät nie):** Fortschrittsfotos (IndexedDB `mg-photos`).
