# METRIC OS — Design-System (Oura-Kaliber)
Referenz: Oura App 2026 (Today / Vitals / My Health / Stress). Ziel: METRICGYM optisch & emotional auf/über Oura-Niveau.

## Leitprinzip
Teuer = wenig, aber absolut diszipliniert. Ein Screen = eine Frage. Tiefe durch Helligkeit, nie durch Konturen. Zahlen sind Monumente (groß + leicht), Auszeichnung ist ein einziges Caps-Format, Emotion kommt aus einer Serif-Stimme und einer Atmosphäre pro Screen.

## Tokens
```css
:root{
  --void:#050607; --bg:#0A0C0F; --s1:#12151A; --s2:#181C22; --s3:#20252D;
  --edge:rgba(255,255,255,.045); --hairline:rgba(255,255,255,.06);
  --ink:#F2F4F6; --body:#A9B2BC; --mute:#6C7480;
  --st-optimal:#8FB8DC; --st-optimal-tint:rgba(126,164,204,.10);
  --st-good:#7FA98F;    --st-good-tint:rgba(111,168,149,.10);
  --st-build:#C4B47A;   --st-build-tint:rgba(196,180,122,.09);
  --st-attn:#D08B6E;    --st-attn-tint:rgba(208,139,110,.10);
  --st-recov:#A99BC9;   --st-recov-tint:rgba(169,155,201,.09);
  --cream:#EFE7DC;
  --fs-score:64px; --fw-score:280; --fs-word:32px; --fs-h:26px; --fs-sect:21px;
  --fs-caps:10.5px; --ls-caps:.15em; --fs-body:15px; --lh-body:1.6; --fs-cap:12px; --fs-micro:10px;
  --pad-screen:24px; --pad-card:20px; --gap-sect:36px; --gap-card:12px;
  --r-card:22px; --r-nest:16px; --r-pill:999px;
  --ease:cubic-bezier(.22,1,.36,1); --t-fast:.25s; --t-soft:.45s; --t-count:900ms;
}
```
Karten: `background:linear-gradient(165deg, var(--st-X-tint), transparent 60%), var(--s1); box-shadow: inset 0 1px var(--edge); border:none; border-radius:var(--r-card);`

## Status-Sprache
Optimal (Puderblau) · Gut (Salbei) · Aufbau (Olivgold) · Achtung (Terrakotta, NIE Rot) · Erholung (Flieder). Statuswörter statt Prozente. Pro Karte genau EINE Statusfarbe. Creme ist reserviert für: aktive Segmente, Tooltips/Annotationen, die eine Primär-Pill.

## Typografie
- Zahl-Monument: 56–64px / 280 / tabular (Scores, kcal, kg, Trend-%)
- Statuswort: Serif 32/500 („Optimal", „Low")
- Coach-Headline: Serif 26/500 — die menschliche Zeile, 1× pro Screen
- Sektionstitel: Serif 21/500
- Caps-Label (DAS eine Format): 10.5/650/.15em, grau oder Statusfarbe
- Body 15/1.6 in --body; nie Bold für lange deutsche Sätze
- Weights >650 nur in Caps-Labels

## Komponenten
1) Statuskarte: Tint-Verlauf + Icon-Disc 32 + Caps-Titel + Statuswort + Zahl 56–64 links + Band-Slider + Chevron.
2) Band-Slider: 3px Track --s3, Füllung Statusfarbe, 10px Knopf (2px Glow), Bandgrenzen 11px darunter. Ersetzt alle Balken/Batterien. (= MEV–MRV sichtbar gemacht → UNSER Pattern.)
3) Kontributor-Zeile: Label 15px | Statuswort rechts farbig | 2px Hairline-Progress darunter = Divider. Zeilenhöhe ~56px.
4) Serif-Coach-Block: Caps-Status + Serif 26 + Body (max 3 Zeilen) + genau eine Pill.
5) Charts: Linien mit semantischem Verlauf (attn→build→good bei Verbesserung); Y-Achse = Wortbänder (z. B. „über Maximum / Wachstums-Zone / unter Reiz"); Grid nur horizontale --hairline; Annotation = Creme-Pill + Fallinie + Leuchtpunkt; Balken ohne Schatten, aktueller Balken als einziger voll gesättigt; Konsistenz-Heatmap = Punkte in Creme-Opazität (25/55/85/100 %), keine blauen Quadrate.
6) Segmented: Creme-Aktiv-Pill, dunkler Text; Rest Textgrau ohne Kontur.
7) Buttons: 1 Primär-Pill/Screen in Creme (dunkler Text); sekundär rgba(255,255,255,.10); tertiär Text in --st-optimal. Volt-Gradient-Buttons entfallen.

## Verbote
Sichtbare 1px-Borders auf Karten · >1 Akzentfarbe pro Karte · >1 Chip pro Zeile · Emojis in UI-Chrome (⚡✓✦💪) · Ausrufezeichen-Ketten · Zahlen-Achsen wo Bänder möglich · Konfetti außer bei echten PRs · Serif in Buttons/Labels.

## Atmosphäre
Pro Tab EINE Stimmung (body[data-tab]-Hue existiert), nur obere ~40 % des Screens, ausblendend nach --bg. ai-field-Intensität unterhalb des Folds → 0. Muskel-Anatomie = unsere Bildsprache (unser „Berg").

## Copy-Ton
Coach-Zeile in Serif („Heute trägt dich dein Schlaf."), Begründung in 2–3 Sätzen Body, Statuswörter statt Zahlenprosa, keine Emojis, kein „!!".

## Screen-Blaupausen
- HOME: Ring-Hero (Zahl 64/280), Metriken ohne Boxen, dann 3 Statuskarten: Training heute (Muskel-Tint + Volumen-Band), Ernährung (kcal-Monument + Ziel-Band), Insight (Serif-Einzeiler).
- TRAINING: Session-Statuskarte (Fokus-Tint) → Übungszeilen ohne Boxen (Name | still „4 × 6–10 · 85 kg", Hairline-Divider, Technik als Caps-Wort) → Creme-Start-Pill → Accordion. Woche = Vitals-Stack. Reiz-Status = Key-metric-Muster (Serif „Optimal" 32 + Band-Slider je Muskel, Buttons danach).
- ANALYTICS: Hero „KRAFT · 4 WOCHEN" + %-Monument + Gradient-Sparkline + Coach-Satz → Kontributor-Zeilen statt Kacheln → Volumen-Chart mit MEV/MRV-Wortbändern → Punkt-Heatmap → Anatomie (borderlos).
- ERNÄHRUNG: kcal-Monument + Ziel-Band, 3 Makro-Band-Slider, Magic-Log = Creme-Pill, Historie als Kontributor-Zeilen.
- PLAYER: --void Fokus. Serif-Übungsname 26, Gewicht 64/280, RIR-Band, Rest = dünner Kreisbogen, Creme-Log-Pill. Sonst nichts.
- LANDING: USP-Hero, Sphäre 96px ruhig, Proof als eine Textzeile, Sektionsabstand 48.

## Roadmap (Impact-sortiert)
1. Token-Swap + Border-Kill + Spacing (1 CSS-Block + ~15 Regeln) — ~70 % des Effekts
2. Typo-Pass (Zahlen groß/leicht, Weights runter, ein Caps-Format)
3. bandSlider()/statusCard()/contribRow() als Helfer, Rollout Home→Training→Analytics
4. Chart-Upgrade (Verläufe, Wortbänder, Annotation-Pills, Punkt-Heatmap)
5. Emoji-/Chip-/„!"-Purge + Copy-Pass
6. Atmosphären-Disziplin pro Tab
7. Motion: Score-Count-up (Code in lpFX portieren), Gauge-Draw 1.2s, Konfetti nur PRs
