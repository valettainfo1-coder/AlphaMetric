"use client";
// ═══════════════════════════════════════════════════════════════════
// PAGE CURTAIN v4 — NO-OP shim.
//
// The actual curtain is now rendered SERVER-SIDE in app/layout.tsx,
// so it's in the very first paint. An inline <head> script decides
// pre-paint whether to show or skip it based on:
//   - Performance Navigation Type (skip on SPA back/forward)
//   - prefers-reduced-motion (skip)
//   - sessionStorage flag (only first visit per session)
//
// Keeping this file as a no-op so any imports / route ordering keeps
// working without churn. Safe to delete in a follow-up cleanup.
// ═══════════════════════════════════════════════════════════════════

export default function PageCurtain() {
  return null;
}
