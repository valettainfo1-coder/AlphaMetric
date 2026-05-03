"use client";
// ═══════════════════════════════════════════════════════════════════
// MESH BACKGROUND v2 — aurora-grade ambient atmosphere
//   1. Slowly rotating conic-gradient base (40s loop)
//   2. Three large drifting blobs (blue / purple / emerald)
//   3. Cursor-following radial spotlight (CSS variable lerp)
//   4. SVG turbulence noise overlay
//   5. Canvas particle field with mouse-attract + connection lines
// All disabled on touch / reduced-motion.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

export default function MeshBackground() {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const spotRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || isTouch) return;

    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    const spot   = spotRef.current;
    if (!wrap || !canvas || !spot) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;

    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    const particles: P[] = Array.from({ length: 64 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 0.5 + Math.random() * 1.8,
    }));

    const mouse = { x: -9999, y: -9999, active: false };

    // CSS-spotlight is moved via custom properties so we don't reflow.
    let spotX = -9999, spotY = -9999;

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      mouse.x = cx;
      mouse.y = cy;
      mouse.active = cx >= 0 && cx <= width && cy >= 0 && cy <= height;
      if (mouse.active) { spotX = cx; spotY = cy; }
    };
    const onLeave = () => { mouse.active = false; };
    const onResize = () => setSize();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);

    const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

    let raf = 0;
    const tick = () => {
      const dark = isDark();
      ctx.clearRect(0, 0, width, height);

      // Particle line layer (line of sight)
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            const alpha = (1 - d2 / 11000) * (dark ? 0.20 : 0.12);
            ctx.strokeStyle = dark
              ? `rgba(220,225,235,${alpha})`
              : `rgba(60,64,72,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Particle physics + draw
      for (const p of particles) {
        if (mouse.active) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 28000 && d2 > 1) {
            const f = 0.07 / Math.sqrt(d2);
            p.vx += dx * f;
            p.vy += dy * f;
          }
        }
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        if (dark) {
          grad.addColorStop(0, "rgba(232,236,242,0.85)");
          grad.addColorStop(1, "rgba(232,236,242,0)");
        } else {
          grad.addColorStop(0, "rgba(20,22,28,0.55)");
          grad.addColorStop(1, "rgba(20,22,28,0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Move CSS spotlight via variables
      spot.style.setProperty("--mx", `${spotX}px`);
      spot.style.setProperty("--my", `${spotY}px`);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={wrapRef} className="am-mesh" aria-hidden="true">
      {/* Conic gradient base */}
      <div className="am-mesh__conic" />
      {/* Aurora blobs */}
      <div className="am-mesh__blob am-mesh__blob--a" />
      <div className="am-mesh__blob am-mesh__blob--b" />
      <div className="am-mesh__blob am-mesh__blob--c" />
      <div className="am-mesh__blob am-mesh__blob--d" />
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="am-mesh__canvas" />
      {/* Cursor-following spotlight */}
      <div ref={spotRef} className="am-mesh__spot" />
      {/* SVG noise grain */}
      <svg className="am-mesh__noise" aria-hidden="true">
        <filter id="am-mesh-noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#am-mesh-noise-filter)" />
      </svg>
      {/* Vignette so blobs feel framed */}
      <div className="am-mesh__vignette" />
    </div>
  );
}
