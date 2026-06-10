"use client";

import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-text-2">{t("errors.routeError")}</p>
      <Button variant="secondary" onClick={reset}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
