# AlphaMetric — Launch Guide (Vercel)

Schritt für Schritt von lokal → Live-Website.

## 0. Voraussetzungen
- GitHub-Account (kostenlos): https://github.com/join
- Vercel-Account (kostenlos): https://vercel.com/signup — mit GitHub einloggen
- API Keys bereithalten:
  - **Finnhub**: https://finnhub.io/register → Dashboard → API Key kopieren
  - **Groq**: https://console.groq.com/keys → „Create API Key" → kopieren (beginnt mit `gsk_`)

## 1. Lokal testen (einmalig)
```bash
npm install
npm run build
npm run start
```
Öffne http://localhost:3000 — wenn alles läuft, weiter zu Schritt 2.

## 2. Git-Repo anlegen
Im Projektordner (`C:\Users\Anwender\Downloads\AlphaMetric`):
```bash
git add .
git commit -m "Launch-ready"
```
Dann auf https://github.com/new ein neues Repo **„alphametric"** anlegen (Private empfohlen).
Danach:
```bash
git remote add origin https://github.com/DEIN-USERNAME/alphametric.git
git branch -M main
git push -u origin main
```

## 3. Auf Vercel deployen
1. https://vercel.com/new öffnen
2. GitHub-Repo **alphametric** auswählen → **Import**
3. Framework: **Next.js** (wird automatisch erkannt)
4. **Environment Variables** hinzufügen (wichtig!):
   - `FINNHUB_API_KEY` = dein Finnhub Key
   - `GROQ_API_KEY` = dein Groq Key (gsk_...)
5. **Deploy** klicken → ~2 Min warten
6. Du bekommst eine URL wie `alphametric-xyz.vercel.app` ✅

## 4. Eigene Domain (optional)
Vercel Project → **Settings → Domains** → Domain eintragen → DNS-Einträge beim Registrar setzen (Vercel zeigt sie dir an).

## 5. Updates deployen
Jede Änderung pushen:
```bash
git add .
git commit -m "Update"
git push
```
Vercel deployt automatisch bei jedem Push.

## Troubleshooting
- **„Metrio AI Backend nicht erreichbar"** → `GROQ_API_KEY` in Vercel fehlt oder falsch
- **Keine Kursdaten** → `FINNHUB_API_KEY` fehlt
- **Build fehlschlägt** → Logs in Vercel → meist TypeScript-Fehler, lokal mit `npm run build` reproduzieren
