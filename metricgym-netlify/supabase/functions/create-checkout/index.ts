/* METRICGYM create-checkout (D4) — startet eine Stripe-Checkout-Session.
   Nur für angemeldete Nutzer; Preis-IDs & Keys bleiben serverseitig.

   Deploy & Secrets:
     supabase functions deploy create-checkout
     supabase secrets set STRIPE_SECRET_KEY=sk_live_... \
       STRIPE_PRICE_PRO_MONTHLY=price_... STRIPE_PRICE_PRO_YEARLY=price_... \
       STRIPE_PRICE_ELITE_MONTHLY=price_... STRIPE_PRICE_ELITE_YEARLY=price_... \
       APP_URL=https://deine-domain.tld */

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  let body: { tier?: string; billing?: string } = {};
  try { body = await req.json(); } catch { /* leer ok */ }
  const tier = body.tier === "elite" ? "elite" : "pro";
  const billing = body.billing === "yearly" ? "yearly" : "monthly";
  const priceEnv = `STRIPE_PRICE_${tier.toUpperCase()}_${billing.toUpperCase()}`;
  const price = Deno.env.get(priceEnv);
  if (!price) return json({ error: { message: `Preis fehlt serverseitig (${priceEnv}) — Betreiber kontaktieren.` } }, 500);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const appUrl = Deno.env.get("APP_URL") ?? "https://metricgym.netlify.app";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    subscription_data: { trial_period_days: 7, metadata: { user_id: user.id, tier } },
    metadata: { user_id: user.id, tier },
    allow_promotion_codes: true,
    success_url: `${appUrl}/?checkout=success`,
    cancel_url: `${appUrl}/?checkout=cancel`,
  });
  return json({ url: session.url });
});
