"use client";
// ═══════════════════════════════════════════════════════════════════
// GLOBAL HEADER & NAVIGATION
// Logo | SearchWithExchange | Nav Links | Auth | Mobile Hamburger
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogIn, ChevronDown, LogOut, Loader2, Sun, Moon } from "lucide-react";
import SearchWithExchange, { SelectedStock } from "@/components/SearchWithExchange";

// ─── NAV ITEMS ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/",           label: "Start" },
  { href: "/portfolio",  label: "Portfolio" },
  { href: "/brief",      label: "Daily Brief" },
  { href: "/screener",   label: "Top Movers" },
  { href: "/watchlists", label: "Watchlists" },
  { href: "/heatmap",    label: "Heatmap" },
];

// ─── ALPHAMETRIC LOGO ────────────────────────────────────────────
// Laedt /public/logo.png (User-Original). Fallback: Inline-SVG.
function LogoFallbackSvg() {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
        <defs>
          {/* Gebürstetes Stahl — horizontale Bänder */}
          <linearGradient id="amlg-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e9ebef" />
            <stop offset="25%"  stopColor="#d3d6dc" />
            <stop offset="50%"  stopColor="#b2b6be" />
            <stop offset="75%"  stopColor="#8d9198" />
            <stop offset="100%" stopColor="#6b6e75" />
          </linearGradient>
          {/* Horizontale „Bürsten"‑Linien (subtil) */}
          <pattern id="amlg-brush" x="0" y="0" width="120" height="1.4" patternUnits="userSpaceOnUse">
            <rect width="120" height="1.4" fill="rgba(255,255,255,0)" />
            <line x1="0" y1="0.4" x2="120" y2="0.4" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4" />
            <line x1="0" y1="1.0" x2="120" y2="1.0" stroke="rgba(0,0,0,0.08)" strokeWidth="0.3" />
          </pattern>
          {/* Anthrazit‑Bevel für A + M */}
          <linearGradient id="amlg-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3c4048" />
            <stop offset="40%"  stopColor="#1d2026" />
            <stop offset="100%" stopColor="#05060a" />
          </linearGradient>
          {/* Silber‑Ribbon */}
          <linearGradient id="amlg-ribbon" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"   stopColor="#5c6068" />
            <stop offset="40%"  stopColor="#eef0f3" />
            <stop offset="60%"  stopColor="#f6f8fa" />
            <stop offset="100%" stopColor="#8a8e96" />
          </linearGradient>
          {/* Plakett‑Glanz von oben */}
          <linearGradient id="amlg-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="45%"  stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
          </linearGradient>
          {/* Bevel‑Filter */}
          <filter id="amlg-bevel" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" />
            <feOffset dx="0.5" dy="0.9" result="off" />
            <feMerge>
              <feMergeNode in="off" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Innerer Glow auf Ribbon */}
          <filter id="amlg-ribbon-glow">
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
        </defs>

        {/* ── Quadratische Brushed‑Steel‑Plakette ── */}
        <rect x="2" y="2" width="116" height="116" rx="18" ry="18"
              fill="url(#amlg-steel)" stroke="#2a2d32" strokeWidth="1.4" />
        {/* Brushed Texture Overlay */}
        <rect x="2" y="2" width="116" height="116" rx="18" ry="18" fill="url(#amlg-brush)" opacity="0.9" />
        {/* Top Shine */}
        <rect x="2" y="2" width="116" height="116" rx="18" ry="18" fill="url(#amlg-shine)" opacity="0.85" />
        {/* Innerer Rand‑Reflex */}
        <rect x="3.5" y="3.5" width="113" height="113" rx="16.5" ry="16.5"
              fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />

        {/* ── „A" — monolithisch, triangulär, mit Kerbe ── */}
        {/* linker Schenkel */}
        <path d="M 20 96 L 48 20 L 60 20 L 46 62 L 38 62 L 32 80 L 60 80 L 56 96 Z"
              fill="url(#amlg-dark)" filter="url(#amlg-bevel)" />
        {/* Highlight‑Streifen auf linkem A‑Schenkel */}
        <path d="M 48 20 L 51 20 L 39.5 58 L 36.5 58 Z" fill="#ffffff" opacity="0.24" />

        {/* ── „M" — rechter Schenkel + innere Säule (bilden das „M" aus dem A‑Dach) ── */}
        {/* äußerer rechter Schenkel */}
        <path d="M 64 20 L 76 20 L 100 96 L 88 96 L 70 40 Z"
              fill="url(#amlg-dark)" filter="url(#amlg-bevel)" />
        {/* innere M‑Säule — vom Zenit zur Mitte */}
        <path d="M 62 22 L 68 22 L 72 58 L 66 58 Z"
              fill="url(#amlg-dark)" filter="url(#amlg-bevel)" />
        {/* Highlight auf äußerem rechten Schenkel */}
        <path d="M 64 20 L 66.5 20 L 72 38 L 69.5 38 Z" fill="#ffffff" opacity="0.22" />

        {/* ── Silber‑Ribbon / Swoosh ── */}
        <path d="M 10 92 C 30 100, 54 68, 72 56 S 104 28, 114 22"
              fill="none" stroke="#000000" strokeOpacity="0.35" strokeWidth="9" strokeLinecap="round"
              transform="translate(0, 2.2)" />
        <path d="M 10 92 C 30 100, 54 68, 72 56 S 104 28, 114 22"
              fill="none" stroke="url(#amlg-ribbon)" strokeWidth="7" strokeLinecap="round" />
        <path d="M 10 92 C 30 100, 54 68, 72 56 S 104 28, 114 22"
              fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round"
              filter="url(#amlg-ribbon-glow)" />
    </svg>
  );
}

function Logo(_props: { isDark: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <Link
      href="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        lineHeight: 1,
      }}
    >
      {imgFailed ? (
        <LogoFallbackSvg />
      ) : (
        <img
          src="/logo.png"
          alt="AlphaMetric"
          width={32}
          height={32}
          onError={() => setImgFailed(true)}
          style={{
            width: 32,
            height: 32,
            display: "block",
            flexShrink: 0,
            objectFit: "contain",
            borderRadius: 8,
          }}
        />
      )}
      <span
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
          fontSize: 20,
          lineHeight: 1,
          letterSpacing: "-0.019em",
          display: "inline-flex",
          alignItems: "baseline",
          gap: 0,
          fontFeatureSettings: "'cv11','ss03','kern'",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        }}
      >
        <span style={{ color: "var(--am-text)", fontWeight: 450 }}>Alpha</span>
        <span style={{ color: "var(--am-text-muted)", fontWeight: 380 }}>Metric</span>
      </span>
    </Link>
  );
}

// ─── AUTH MODAL ──────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSuccess }: { mode: "login" | "signup"; onClose: () => void; onSuccess: (user: { id: string; email: string; name: string }) => void }) {
  const [tab, setTab] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const body = tab === "signup"
        ? { action: "signup", email, password, name }
        : { action: "login", email, password };
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      onSuccess(data.user);
    } catch {
      setError("Verbindungsfehler");
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div className="am-glass" onClick={e => e.stopPropagation()} style={{
        borderRadius: 20, padding: "0", width: 400, overflow: "hidden",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--am-border)" }}>
          {(["login", "signup"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }} style={{
              flex: 1, padding: "16px 0", border: "none",
              background: tab === t ? "var(--am-card)" : "var(--am-card-soft)",
              borderBottom: tab === t ? "2px solid var(--am-accent)" : "2px solid transparent",
              fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              color: tab === t ? "var(--am-text)" : "var(--am-text-faint)",
            }}>
              {t === "login" ? "Anmelden" : "Registrieren"}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px 28px 28px" }}>
          {tab === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text-secondary)", display: "block", marginBottom: 6 }}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--am-border)", background: "var(--am-input-bg)", color: "var(--am-text)", fontSize: 14, fontFamily: "inherit", outline: "none" }}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text-secondary)", display: "block", marginBottom: 6 }}>E-Mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="max@example.com"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--am-border)", background: "var(--am-input-bg)", color: "var(--am-text)", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text-secondary)", display: "block", marginBottom: 6 }}>Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder={tab === "signup" ? "Min. 6 Zeichen" : "Passwort"}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--am-border)", background: "var(--am-input-bg)", color: "var(--am-text)", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--am-red-bg)", border: "1px solid var(--am-red-text)", fontSize: 13, color: "var(--am-red-text)", marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: 12,
            background: loading ? "var(--am-text-faint)" : "linear-gradient(135deg, var(--am-accent), var(--am-accent-hover))", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading && <Loader2 size={16} className="spin" />}
            {tab === "login" ? "Anmelden" : "Konto erstellen"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ─── MAIN HEADER COMPONENT ───────────────────────────────────────
export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Theme state is OWNED by the DOM (set by <head> script before paint + toggle
  // button). This effect never WRITES to data-theme — it only OBSERVES it,
  // so client-side navigation can never accidentally flip the theme.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "am-theme") return;
      if (e.newValue === "dark") document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
    };
    window.addEventListener("storage", onStorage);
    return () => {
      obs.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("am-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("am-theme", "light");
    }
  };

  // Check session on mount
  useEffect(() => {
    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "me" }),
    }).then(r => r.json()).then(d => {
      if (d.user) setCurrentUser(d.user);
    }).catch(() => {});
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const handleSearchSelect = (stock: SelectedStock) => {
    window.location.href = `/stock/${stock.symbol}?exchange=${stock.exchange}`;
  };

  const handleAuthSuccess = useCallback((user: { id: string; email: string; name: string }) => {
    setCurrentUser(user);
    setAuthModal(null);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setCurrentUser(null);
    setUserMenuOpen(false);
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .hdr-search  { display: none !important; }
          .hdr-nav     { display: none !important; }
          .hdr-auth    { display: none !important; }
          .hdr-burger  { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hdr-burger  { display: none !important; }
          .hdr-mobile-menu { display: none !important; }
        }
      `}</style>

      <header style={{
        position: "sticky", top: 0, zIndex: 300,
        background: "var(--am-header-bg)",
        backdropFilter: "saturate(200%) blur(28px)",
        WebkitBackdropFilter: "saturate(200%) blur(28px)",
        borderBottom: "1px solid var(--am-border)",
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.08)",
      }}>
        {/* ── DESKTOP ROW ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          maxWidth: 1360, margin: "0 auto",
          padding: "0 32px", height: 80, minHeight: 80, maxHeight: 80, gap: 20,
          boxSizing: "border-box",
        }}>
          <div style={{ flexShrink: 0 }}>
            <Logo isDark={isDark} />
          </div>

          <div className="hdr-search" style={{ flex: 1, maxWidth: 420, display: "flex", justifyContent: "center" }}>
            <SearchWithExchange onSelect={handleSearchSelect} placeholder="Aktie suchen..." />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <nav className="hdr-nav" style={{ display: "flex", gap: 2, marginRight: 8 }}>
              {NAV_ITEMS.map(item => {
                const active = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} style={{
                    fontSize: 13, fontWeight: 600, textDecoration: "none",
                    padding: "7px 12px", borderRadius: 8,
                    color: active ? "var(--am-text)" : "var(--am-text-muted)",
                    background: active ? "var(--am-card-hover)" : "transparent",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                  }}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Light Mode" : "Dark Mode"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 9,
                background: "var(--am-card-hover)", border: "1px solid var(--am-border)",
                cursor: "pointer", flexShrink: 0, marginRight: 4,
              }}
            >
              {isDark
                ? <Sun size={16} color="var(--am-accent)" />
                : <Moon size={16} color="var(--am-text-muted)" />}
            </button>

            {/* Auth buttons */}
            <div className="hdr-auth" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {currentUser ? (
                <div data-user-menu="" style={{ position: "relative" }}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", borderRadius: 10,
                      background: "var(--am-card-hover)", border: "1px solid var(--am-border)",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--am-accent), var(--am-accent-hover))", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--am-text-secondary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {currentUser.name}
                    </span>
                    <ChevronDown size={13} color="var(--am-text-muted)" />
                  </button>
                  {userMenuOpen && (
                    <div className="am-glass" style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0,
                      borderRadius: 12, minWidth: 200, overflow: "hidden", zIndex: 999,
                    }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--am-border-light)" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)" }}>{currentUser.name}</p>
                        <p style={{ fontSize: 11, color: "var(--am-text-faint)" }}>{currentUser.email}</p>
                      </div>
                      <button onClick={handleLogout} style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "12px 16px", border: "none", background: "transparent",
                        fontSize: 13, color: "var(--am-red-text)", cursor: "pointer", fontFamily: "inherit",
                        textAlign: "left", fontWeight: 600,
                      }}>
                        <LogOut size={14} /> Abmelden
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={() => setAuthModal("login")} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 14px", borderRadius: 9, height: 34,
                    background: "transparent", border: "1px solid var(--am-border)",
                    fontSize: 13, fontWeight: 600, color: "var(--am-text-secondary)",
                    cursor: "pointer", fontFamily: "inherit",
                    whiteSpace: "nowrap", lineHeight: 1,
                  }}>
                    <LogIn size={14} /> Login
                  </button>
                  <button onClick={() => setAuthModal("signup")} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "7px 16px", borderRadius: 9, height: 34,
                    background: "linear-gradient(135deg, var(--am-accent), var(--am-accent-hover))", border: "none",
                    fontSize: 13, fontWeight: 700, color: "var(--am-accent-text)",
                    cursor: "pointer", fontFamily: "inherit",
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap", lineHeight: 1,
                  }}>
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* HAMBURGER (mobile only) */}
            <button
              className="hdr-burger"
              onClick={() => setMobileOpen(v => !v)}
              style={{
                display: "none", alignItems: "center", justifyContent: "center",
                width: 40, height: 40, borderRadius: 10,
                background: mobileOpen ? "var(--am-card-hover)" : "transparent",
                border: "1px solid var(--am-border)", cursor: "pointer",
              }}
            >
              {mobileOpen ? <X size={20} color="var(--am-text)" /> : <Menu size={20} color="var(--am-text)" />}
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU ── */}
        {mobileOpen && (
          <div className="hdr-mobile-menu am-glass" style={{
            borderTop: "1px solid var(--am-border)",
            padding: "16px 24px",
          }}>
            <div style={{ marginBottom: 16 }}>
              <SearchWithExchange onSelect={handleSearchSelect} placeholder="Aktie suchen..." />
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              {NAV_ITEMS.map(item => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} style={{
                    fontSize: 15, fontWeight: 600, textDecoration: "none",
                    padding: "12px 16px", borderRadius: 10,
                    color: active ? "var(--am-text)" : "var(--am-text-muted)",
                    background: active ? "var(--am-card-hover)" : "transparent",
                  }}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ display: "flex", gap: 8 }}>
              {currentUser ? (
                <button onClick={handleLogout} style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  background: "var(--am-red-bg)", border: "none",
                  fontSize: 14, fontWeight: 600, color: "var(--am-red-text)",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  Abmelden ({currentUser.name})
                </button>
              ) : (
                <>
                  <button onClick={() => { setAuthModal("login"); setMobileOpen(false); }} style={{
                    flex: 1, padding: "12px", borderRadius: 10,
                    background: "transparent", border: "1px solid var(--am-border)",
                    fontSize: 14, fontWeight: 600, color: "var(--am-text-secondary)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Login
                  </button>
                  <button onClick={() => { setAuthModal("signup"); setMobileOpen(false); }} style={{
                    flex: 1, padding: "12px", borderRadius: 10,
                    background: "linear-gradient(135deg, var(--am-accent), var(--am-accent-hover))", border: "none",
                    fontSize: 14, fontWeight: 700, color: "#fff",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={handleAuthSuccess} />
      )}
    </>
  );
}
