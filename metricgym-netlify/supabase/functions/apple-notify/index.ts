/* METRICGYM apple-notify — Apples Server-Benachrichtigungen (V2).
   ----------------------------------------------------------------------------
   OHNE diese Function behält ein gekündigtes, abgelaufenes oder
   zurückerstattetes Abo seinen Rang für immer: `apple-verify` läuft nur beim
   Kauf, und danach meldet sich die App nicht mehr. Apple schickt jede
   Änderung hierher — Verlängerung, Ablauf, Rückerstattung, Kündigung.

   Apple ruft diesen Endpunkt OHNE Supabase-Token auf, deshalb --no-verify-jwt.
   Die Echtheit kommt nicht von einem Token, sondern aus der Signatur des
   Inhalts: derselbe Kettencheck wie in apple-verify.

   Deploy:
     supabase functions deploy apple-notify --no-verify-jwt
   App Store Connect → App → Allgemeine Informationen → URL für
   App-Store-Server-Benachrichtigungen (Version 2):
     https://<projekt>.supabase.co/functions/v1/apple-notify
   Produktion und Sandbox haben getrennte Felder — beide eintragen.         */

import { createClient } from "npm:@supabase/supabase-js@2";
import { jwsPruefen, zeileAus, statusAus, BUNDLE_ID, type Transaktion } from "../_shared/apple.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

/* Apples äußere Nutzlast. `data.signedTransactionInfo` ist selbst wieder ein
   JWS — Apple verschachtelt zwei Signaturen. */
type Aussen = {
  notificationType?: string;
  subtype?: string;
  data?: { bundleId?: string; environment?: string; signedTransactionInfo?: string; signedRenewalInfo?: string };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST erwartet" }, 405);

  let signedPayload: string | undefined;
  try { signedPayload = (await req.json()).signedPayload; } catch { /* unten abgefangen */ }
  if (!signedPayload) return json({ error: "signedPayload fehlt" }, 400);

  /* 1 · Äußere Signatur. Ohne gültige Kette ist das nicht Apple. */
  let aussen: Aussen;
  try {
    aussen = await jwsPruefen(signedPayload) as unknown as Aussen;
  } catch (e) {
    console.error("apple-notify: äußere Signatur abgelehnt —", String(e));
    return json({ error: "Signatur ungültig" }, 400);
  }

  if (aussen.data?.bundleId && aussen.data.bundleId !== BUNDLE_ID()) {
    console.error(`apple-notify: fremde bundleId ${aussen.data.bundleId}`);
    return json({ error: "fremde App" }, 400);
  }

  const innen = aussen.data?.signedTransactionInfo;
  if (!innen) {
    /* Manche Meldungen (z. B. TEST) tragen keine Transaktion. Mit 200
       antworten, sonst wiederholt Apple sie tagelang. */
    console.log(`apple-notify: ${aussen.notificationType}/${aussen.subtype ?? "-"} ohne Transaktion`);
    return json({ received: true });
  }

  /* 2 · Innere Signatur — die Transaktion selbst. */
  let t: Transaktion;
  try {
    t = await jwsPruefen(innen);
  } catch (e) {
    console.error("apple-notify: innere Signatur abgelehnt —", String(e));
    return json({ error: "Transaktion ungültig" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const otid = t.originalTransactionId ?? t.transactionId ?? null;
  if (!otid) return json({ received: true });

  /* 3 · Zu welchem Konto gehört das?
         Erst der Beleg selbst (appAccountToken), dann die beim Kauf
         geschriebene Zeile. Finden wir nichts, ist der Kauf nie über
         apple-verify gelaufen — dann gibt es auch nichts zu aktualisieren. */
  let userId = typeof t.appAccountToken === "string" ? t.appAccountToken : null;
  if (!userId) {
    const { data } = await admin.from("subscriptions")
      .select("user_id").eq("apple_original_transaction_id", otid).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.log(`apple-notify: ${aussen.notificationType} für unbekannten Kauf ${otid} — ignoriert`);
    return json({ received: true });
  }

  /* 4 · Zeile neu berechnen. zeileAus() setzt status anhand von expiresDate
         und revocationDate — damit sind Verlängerung und Ablauf schon
         abgedeckt. Die Meldungsart kommt nur dort obendrauf, wo Apple etwas
         weiß, was nicht in der Transaktion steht. */
  let zeile;
  try { zeile = zeileAus(t, userId); }
  catch (e) {
    console.error("apple-notify:", String(e));
    return json({ received: true });          // unbekanntes Produkt: nichts tun
  }

  const typ = String(aussen.notificationType ?? "");
  const unter = String(aussen.subtype ?? "");
  zeile.status = statusAus(zeile.status, typ, unter);   // Regeln samt Begründung in _shared/apple.ts

  const res = await admin.from("subscriptions").upsert(zeile, { onConflict: "user_id,source" });
  if (res.error) {
    /* 5xx, damit Apple erneut zustellt. Apple wiederholt über mehrere Stunden. */
    console.error("apple-notify: Schreiben fehlgeschlagen —", res.error.message);
    return json({ error: "Speichern fehlgeschlagen" }, 500);
  }

  console.log(`apple-notify: ${typ}/${unter || "-"} → ${zeile.tier}/${zeile.status} für ${userId}`);
  return json({ received: true });
});
