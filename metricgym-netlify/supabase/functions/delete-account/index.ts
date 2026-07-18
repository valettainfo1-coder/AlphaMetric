/* METRICGYM delete-account — Supabase Edge Function (C3, Art. 17 DSGVO).
   Löscht ALLE serverseitigen Daten des angemeldeten Nutzers UND den
   Auth-User selbst. Service-Role-Key existiert NUR hier (nie im Client).

   Deploy:
     supabase functions deploy delete-account
   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sind in
   Edge Functions automatisch gesetzt.) */

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: { message: "POST erwartet" } }, 405);

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Identität serverseitig verifizieren — nur der Nutzer selbst darf sich löschen.
  const asUser = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: { message: "Nicht angemeldet." } }, 401);

  const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const uid = user.id;

  // Reihenfolge: erst Daten-Tabellen, zuletzt der Auth-User. Fehler in einzelnen
  // Tabellen (existiert evtl. nicht) brechen die Löschung NICHT ab — Art. 17
  // verlangt das Ergebnis, nicht eine bestimmte Reihenfolge.
  const tables = ["user_state", "consent_log", "subscriptions", "ai_usage", "referrals"];
  const partial: string[] = [];
  for (const t of tables) {
    try {
      const col = t === "referrals" ? "referee_id" : "user_id";
      const { error } = await admin.from(t).delete().eq(col, uid);
      if (error) partial.push(t);
    } catch (_) { partial.push(t); }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    return json({ error: { message: "Konto-Löschung fehlgeschlagen — bitte erneut versuchen oder den Support kontaktieren." }, partial }, 500);
  }
  return json({ ok: true, partial });
});
