/* METRICGYM stripe-webhook (D4) — hält `subscriptions` synchron.
   Stripe → Webhook-Endpoint dieser Function; Signatur wird geprüft.

   Deploy & Secrets:
     supabase functions deploy stripe-webhook --no-verify-jwt
     supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
   Stripe-Dashboard → Webhooks → Events:
     checkout.session.completed, customer.subscription.updated,
     customer.subscription.deleted */

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST erwartet" }, 405);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (_) {
    return json({ error: "Ungültige Signatur" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  /* onConflict MUSS (user_id, source) sein: der Schlüssel der Tabelle ist seit
     dem Apple-Kaufweg zweispaltig. Mit "user_id" allein wirft Postgres einen
     Fehler, und der blieb hier früher unbemerkt — siehe `pruefen` unten. */
  const upsert = (row: Record<string, unknown>) =>
    admin.from("subscriptions").upsert({ source: "stripe", ...row }, { onConflict: "user_id,source" });

  /* Jeder Schreibfehler MUSS 5xx ergeben, damit Stripe erneut zustellt.
     Vorher wurde das Ergebnis gar nicht angesehen: ein gescheiterter Schreib-
     vorgang sah für Stripe wie Erfolg aus und wurde nie wiederholt. */
  const pruefen = (res: { error: unknown }) => {
    if (res.error) throw new Error(String((res.error as { message?: string }).message ?? res.error));
  };

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id ?? s.metadata?.user_id;
      if (userId) {
        pruefen(await upsert({
          user_id: userId,
          tier: s.metadata?.tier === "elite" ? "elite" : "pro",
          status: "active",
          stripe_customer_id: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
        }));
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const userId = sub.metadata?.user_id;
      const ended = event.type === "customer.subscription.deleted"
        || ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);

      /* Hier stand `tier: ended ? "free" : …`. Die Tabelle erlaubt aber nur
         'pro' und 'elite' — gegen echtes Postgres geprüft: die Zeile wurde
         abgewiesen, der Kunde behielt `pro / active` und damit seinen bezahlten
         Rang nach der Kündigung dauerhaft. Die Stufe bleibt deshalb stehen;
         beendet wird über `status`, und genau danach fragt my_tier(). */
      const row = {
        tier: sub.metadata?.tier === "elite" ? "elite" : "pro",
        status: ended ? "canceled" : sub.status,               // active | trialing | past_due …
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        stripe_customer_id: customerId ?? null,
      };
      if (userId) pruefen(await upsert({ user_id: userId, ...row }));
      else if (customerId) {
        pruefen(await admin.from("subscriptions").update(row)
          .eq("stripe_customer_id", customerId).eq("source", "stripe"));
      }
    }
  } catch (e) {
    return json({ error: "Verarbeitung fehlgeschlagen", detail: String(e).slice(0, 120) }, 500);
  }
  return json({ received: true });
});
