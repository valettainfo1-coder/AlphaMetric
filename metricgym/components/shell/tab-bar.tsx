"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Dumbbell,
  MessageCircle,
  Settings,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/app/today", key: "tabs.today", icon: Zap },
  { href: "/app/train", key: "tabs.train", icon: Dumbbell },
  // Analytics is the flagship: center position, visually elevated.
  { href: "/app/analytics", key: "tabs.analytics", icon: Activity, flagship: true },
  { href: "/app/nutrition", key: "tabs.nutrition", icon: UtensilsCrossed },
  { href: "/app/coach", key: "tabs.coach", icon: MessageCircle },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <>
      {/* Mobile: bottom tab bar with safe-area inset */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface-1/95 backdrop-blur-none safe-bottom md:hidden"
        aria-label="Hauptnavigation"
      >
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const flagship = "flagship" in tab && tab.flagship;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap-target flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-150",
                  active ? "text-volt" : "text-text-2",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center transition-transform duration-150",
                    flagship &&
                      "h-11 w-11 -mt-4 rounded-pill border border-border bg-surface-2",
                    flagship && active && "border-volt/50 bg-volt/10",
                  )}
                >
                  <Icon size={flagship ? 22 : 20} strokeWidth={active ? 2.4 : 2} />
                </span>
                {t(tab.key)}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: sidebar */}
      <nav
        className="hidden md:flex fixed left-0 inset-y-0 z-40 w-56 flex-col gap-1 border-r border-border bg-surface-1 p-4"
        aria-label="Hauptnavigation"
      >
        <div className="mb-6 px-3 pt-2 font-semibold tracking-widest text-text-1">
          METRIC<span className="text-volt">GYM</span>
        </div>
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active ? "bg-volt/10 text-volt" : "text-text-2 hover:text-text-1 hover:bg-surface-2",
              )}
            >
              <Icon size={18} />
              {t(tab.key)}
            </Link>
          );
        })}
        <Link
          href="/app/settings"
          aria-current={pathname.startsWith("/app/settings") ? "page" : undefined}
          className={cn(
            "mt-auto flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors duration-150",
            pathname.startsWith("/app/settings")
              ? "bg-volt/10 text-volt"
              : "text-text-2 hover:text-text-1 hover:bg-surface-2",
          )}
        >
          <Settings size={18} />
          {t("tabs.settings")}
        </Link>
      </nav>
    </>
  );
}
