"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { isDemoMode } from "@/lib/data";
import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/95 px-4 py-3 md:px-8">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        {isDemoMode() && <Badge variant="info">{t("app.demoBadge")}</Badge>}
      </div>
      <Link
        href="/app/settings"
        aria-label={t("tabs.settings")}
        className="tap-target flex items-center justify-center rounded-pill text-text-2 hover:text-text-1 md:hidden"
      >
        <Settings size={20} />
      </Link>
    </header>
  );
}
