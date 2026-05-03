"use client";
// ═══════════════════════════════════════════════════════════════════
// LIQUID CURSOR v2 — magnetic, spring-driven, glow-trailed.
// Three layers: tight precision dot · slow glowing aura · magnetic
// snap-bracket that wraps around the hovered interactive element.
// No mix-blend-difference (which inverted text + caused click jank).
// Pointer-events strictly off, click pass-through guaranteed.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor], input[type="submit"], input[type="button"], summary, label[for]';

export default function LiquidCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || isTouch) return;

    const dot  = dotRef.current;
    const aura = auraRef.current;
    const snap = snapRef.current;
    if (!dot || !aura || !snap) return;

    document.documentElement.classList.add("am-cursor-on");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx, dy = my;       // dot position
    let ax = mx, ay = my;       // aura position
    let isDown = false;
    let hoverTarget: HTMLElement | null = null;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target as HTMLElement | null;
      const ht = t?.closest?.(HOVER_SELECTOR) as HTMLElement | null;
      hoverTarget = ht;
    };
    const onDown = () => { isDown = true; };
    const onUp   = () => { isDown = false; };
    const onLeave = () => {
      dot.style.opacity = "0";
      aura.style.opacity = "0";
      snap.style.opacity = "0";
    };
    const onEnter = () => {
      dot.style.opacity = "1";
      aura.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup",   onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    let raf = 0;
    const loop = () => {
      // ── Spring lerp: dot tight, aura lazy ──
      dx += (mx - dx) * 0.42;
      dy += (my - dy) * 0.42;
      ax += (mx - ax) * 0.13;
      ay += (my - ay) * 0.13;

      // Click feedback
      const dotScale  = isDown ? 0.55 : 1;
      const auraScale = isDown ? 0.7  : (hoverTarget ? 1.35 : 1);

      dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(${dotScale})`;
      aura.style.transform = `translate3d(${ax}px, ${ay}px, 0) translate(-50%, -50%) scale(${auraScale})`;

      // ── Magnetic snap to hovered element ──
      if (hoverTarget && hoverTarget.isConnected) {
        const r = hoverTarget.getBoundingClientRect();
        // Skip enormous regions (e.g. <body> or huge containers)
        if (r.width < window.innerWidth * 0.85 && r.height < 320) {
          const padX = 6, padY = 4;
          snap.style.opacity = "1";
          snap.style.width  = `${r.width  + padX * 2}px`;
          snap.style.height = `${r.height + padY * 2}px`;
          snap.style.transform = `translate3d(${r.left - padX}px, ${r.top - padY}px, 0)`;
          snap.style.borderRadius = `${Math.min(20, Math.max(8, parseFloat(getComputedStyle(hoverTarget).borderRadius) || 12))}px`;
        } else {
          snap.style.opacity = "0";
        }
      } else {
        snap.style.opacity = "0";
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("am-cursor-on");
    };
  }, []);

  return (
    <>
      <div ref={snapRef} className="am-cursor am-cursor--snap" aria-hidden="true" />
      <div ref={auraRef} className="am-cursor am-cursor--aura" aria-hidden="true" />
      <div ref={dotRef}  className="am-cursor am-cursor--dot"  aria-hidden="true" />
    </>
  );
}
