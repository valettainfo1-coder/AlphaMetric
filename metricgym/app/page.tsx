import Link from "next/link";
import { Activity, Brain, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";

const FEATURES = [
  { icon: Brain, titleKey: "landing.feature1Title", bodyKey: "landing.feature1Body" },
  { icon: Activity, titleKey: "landing.feature2Title", bodyKey: "landing.feature2Body" },
  { icon: TrendingUp, titleKey: "landing.feature3Title", bodyKey: "landing.feature3Body" },
] as const;

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 md:max-w-4xl">
      {/* Hero */}
      <header className="mb-16">
        <p className="mb-8 font-semibold tracking-widest">
          METRIC<span className="text-volt">GYM</span>
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight md:text-6xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mb-8 max-w-xl text-text-2">{t("landing.heroSub")}</p>
        <div className="flex flex-col gap-3 md:flex-row">
          <Link href="/onboarding">
            <Button variant="primary" size="lg" className="md:w-auto" data-testid="cta-start">
              {t("landing.ctaPrimary")}
            </Button>
          </Link>
          <Link href="/app/today">
            <Button variant="secondary" size="lg" className="md:w-auto">
              {t("landing.ctaSecondary")}
            </Button>
          </Link>
        </div>
      </header>

      {/* 3 feature blocks */}
      <section className="mb-16 grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
          <Card key={titleKey}>
            <Icon size={22} className="mb-3 text-volt" />
            <h2 className="mb-2 font-semibold">{t(titleKey)}</h2>
            <p className="text-sm text-text-2">{t(bodyKey)}</p>
          </Card>
        ))}
      </section>

      {/* Pricing */}
      <section className="mb-16">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-text-2">
          {t("landing.pricingTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="mb-1 font-semibold">{t("landing.pricingFree")}</h3>
            <p className="metric mb-2 text-3xl font-bold">0 €</p>
            <p className="text-sm text-text-2">{t("landing.pricingFreeDesc")}</p>
          </Card>
          <Card className="border-volt/40">
            <h3 className="mb-1 font-semibold text-volt">{t("landing.pricingPro")}</h3>
            <p className="metric mb-2 text-3xl font-bold">{t("landing.pricingProPrice")}</p>
            <p className="text-sm text-text-2">{t("landing.pricingProDesc")}</p>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-16 text-center">
        <p className="mb-4 text-text-2">{t("app.tagline")}</p>
        {/* One volt primary per screen — the hero owns it. */}
        <Link href="/onboarding">
          <Button variant="secondary" size="lg" className="md:w-auto">
            {t("landing.ctaPrimary")}
          </Button>
        </Link>
      </section>
    </div>
  );
}
