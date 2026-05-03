"use client";
// ═══════════════════════════════════════════════════════════════════
// REVEAL — IntersectionObserver-driven scroll reveal.
// Use as <Reveal>...</Reveal> or <Reveal as="section" delay={120}>.
// CSS for .am-reveal lives in globals.css.
// ═══════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, ReactNode, ElementType } from "react";

type Props = {
  children: ReactNode;
  as?: ElementType;
  delay?: number;        // ms
  className?: string;
  once?: boolean;
};

export default function Reveal({ children, as: Tag = "div", delay = 0, className = "", once = true }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => el.classList.add("is-in"), delay);
            if (once) io.unobserve(el);
          } else if (!once) {
            el.classList.remove("is-in");
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, once]);

  const Component = Tag as ElementType;
  return (
    <Component ref={ref as React.Ref<HTMLElement>} className={`am-reveal ${className}`.trim()}>
      {children}
    </Component>
  );
}
