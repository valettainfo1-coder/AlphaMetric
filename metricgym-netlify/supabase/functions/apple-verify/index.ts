/* METRICGYM apple-verify — prüft einen Kauf aus dem App Store und schreibt
   den Anspruch in `subscriptions`.

   Die App schickt nach jedem Kauf und jedem „Käufe wiederherstellen" das
   `jwsRepresentation` der StoreKit-2-Transaktion hierher. Was Apple signiert
   hat, zählt; alles andere wird abgewiesen. Der Client bestimmt seine Stufe
   NIE selbst.

   Deploy & Secrets:
     supabase functions deploy apple-verify
     supabase secrets set APPLE_BUNDLE_ID=de.metricgym.app
     # nur zum Testen mit Sandbox-Käufen:
     supabase secrets set APPLE_ALLOW_SANDBOX=1                             */

import { createClient } from "npm:@supabase/supabase-js@2";
import { jwsPruefen, zeileAus, umgebungOk, BUNDLE_ID } from "../_shared/apple.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: { message: "POST erwartet" } }, 405);

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: { message: "Bitte melde dich an." } }, 401);

  let body: { jws?: string } = {};
  try { body = await req.json(); } catch { /* leer ok */ }
  if (!body.jws || typeof body.jws !== "string") {
    return json({ error: { message: "Kein Kaufbeleg übergeben." } }, 400);
  }

  /* 1 · Signatur und Zertifikatskette. Schlägt das fehl, ist der Beleg nicht
         von Apple — und es wird nichts freigeschaltet. */
  let t;
  try {
    t = await jwsPruefen(body.jws);
  } catch (e) {
    console.error("apple-verify: Beleg abgelehnt —", String(e));
    return json({ error: { message: "Kaufbeleg konnte nicht geprüft werden." } }, 400);
  }

  /* 2 · Gehört der Beleg zu DIESER App? */
  if (t.bundleId !== BUNDLE_ID()) {
    console.error(`apple-verify: fremde bundleId ${t.bundleId}`);
    return json({ error: { message: "Kaufbeleg gehört nicht zu dieser App." } }, 400);
  }

  /* 3 · Sandbox-Belege schalten in Produktion nichts frei — sonst könnte sich
         jeder mit einem Testkauf ELITE holen. */
  if (!umgebungOk(t)) {
    console.error(`apple-verify: Umgebung ${t.environment} nicht erlaubt`);
    return json({ error: { message: "Kaufbeleg stammt nicht aus dem App Store." } }, 400);
  }

  /* 4 · Zu wem gehört der Kauf?
         Die App übergibt beim Kauf die Supabase-Nutzer-ID als
         `applicationUsername`; Apple trägt sie als `appAccountToken` in den
         Beleg ein. Ist sie da und passt NICHT zum angemeldeten Konto, versucht
         gerade jemand, einen fremden Beleg einzulösen.
         Fehlt sie (Käufe von vor dieser Fassung), gilt das angemeldete Konto —
         dagegen schützt der eindeutige Index auf
         apple_original_transaction_id: ein Beleg, ein Konto. */
  if (t.appAccountToken && String(t.appAccountToken).toLowerCase() !== user.id.toLowerCase()) {
    console.error("apple-verify: appAccountToken passt nicht zum angemeldeten Konto");
    return json({ error: { message: "Dieser Kauf gehört zu einem anderen Konto." } }, 409);
  }

  /* 5 · Eintragen. Nur der Server darf das (Service-Role) — die Tabelle hat
         bewusst keine Schreib-Policy für Clients. */
  let zeile;
  try { zeile = zeileAus(t, user.id); }
  catch (e) {
    console.error("apple-verify:", String(e));
    return json({ error: { message: "Unbekanntes Produkt." } }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const res = await admin.from("subscriptions").upsert(zeile, { onConflict: "user_id,source" });
  if (res.error) {
    /* Verletzter eindeutiger Index = der Beleg hängt schon an einem anderen
       Konto. Das ist kein Serverfehler, sondern eine Aussage. */
    const doppelt = String(res.error.message).includes("subscriptions_apple_otid");
    console.error("apple-verify: Schreiben fehlgeschlagen —", res.error.message);
    return json({ error: { message: doppelt
      ? "Dieser Kauf ist bereits einem anderen Konto zugeordnet."
      : "Kauf konnte nicht gespeichert werden." } }, doppelt ? 409 : 500);
  }

  return json({
    tier: zeile.status === "active" ? zeile.tier : "free",
    status: zeile.status,
    expires: zeile.current_period_end,
    productId: t.productId,
  });
});
