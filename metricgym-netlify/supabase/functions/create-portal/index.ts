/* METRICGYM create-portal (D4) — Stripe-Kundenportal (Kündigen, Zahlungsdaten,
   Rechnungen). Erfüllt die DE-Pflicht, Verträge in der App kündbar zu machen.

   Deploy: supabase functions deploy create-portal
   (nutzt STRIPE_SECRET_KEY + APP_URL aus den Function-Secrets) */

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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sub } = await admin.from("subscriptions")
    .select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!sub?.stripe_customer_id)
    return json({ error: { message: "Kein aktives Abo gefunden — es gibt nichts zu kündigen." } }, 404);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const appUrl = Deno.env.get("APP_URL") ?? "https://metricgym.netlify.app";
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: appUrl,
  });
  return json({ url: portal.url });
});
