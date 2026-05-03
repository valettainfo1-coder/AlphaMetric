"use client";
// ═══════════════════════════════════════════════════════════════════
// ROUTE TRANSITION — slim top progress bar on every navigation.
// We deliberately do NOT re-mount or fade the page content: that
// caused a one-frame flash where header (dark glass) + empty body
// (light) split the screen visually. Instead we only flash a hairline
// gradient bar at the top — same feedback, zero layout disruption.
// ═══════════════════════════════════════════════════════════════════

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [barActive, setBarActive] = useState(false);
  const firstRender = useRef(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setBarActive(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarActive(true));
    });

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBarActive(false), 700);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [pathname]);

  return (
    <>
      <div
        className={`am-route-bar${barActive ? " is-active" : ""}`}
        aria-hidden="true"
      />
      {children}
    </>
  );
}
