"use client";

/**
 * Auth: Supabase magic link + Google OAuth. In demo mode this page just
 * forwards into the app (auth is bypassed, header shows the Demo badge).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { isDemoMode } from "@/lib/data";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendMagicLink() {
    setBusy(true);
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase/client");
      await createBrowserSupabase().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/app/today` },
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    const { createBrowserSupabase } = await import("@/lib/supabase/client");
    await createBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app/today` },
    });
  }

  const demo = isDemoMode();
  useEffect(() => {
    if (demo) router.replace("/app/today");
  }, [demo, router]);
  if (demo) return null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">{t("auth.loginTitle")}</h1>
      <p className="text-sm text-text-2">{t("auth.loginBody")}</p>
      {sent ? (
        <p className="rounded-card border border-volt/30 bg-volt/10 p-4 text-sm text-volt">
          {t("auth.magicLinkSent")}
        </p>
      ) : (
        <>
          <input
            type="email"
            placeholder={t("onboarding.signupEmail")}
            className="h-12 w-full rounded-card border border-border bg-surface-2 px-4 text-text-1 placeholder:text-text-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button variant="primary" size="lg" disabled={busy || !email.includes("@")} onClick={sendMagicLink}>
            {t("onboarding.signupMagicLink")}
          </Button>
          <Button variant="secondary" size="lg" onClick={signInGoogle}>
            {t("onboarding.signupGoogle")}
          </Button>
        </>
      )}
    </div>
  );
}
