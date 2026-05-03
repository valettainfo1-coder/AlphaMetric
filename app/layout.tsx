import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import MarketTicker from "@/components/MarketTicker";
import LiquidCursor from "@/components/LiquidCursor";
import PageCurtain from "@/components/PageCurtain";
import RouteTransition from "@/components/RouteTransition";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://alphametric.app";

export const metadata: Metadata = {
  title: {
    default: "AlphaMetric - Die Investment-Zentrale für Privatanleger",
    template: "%s | AlphaMetric",
  },
  description: "Daily Brief, Top Movers, Aktiensuche, KI-Analyst Metrio und Portfolio-Kontext für Privatanleger, die Aktien wirklich verstehen wollen.",
  keywords: ["Aktienanalyse", "Privatanleger", "Top Movers", "Daily Brief", "Metrio AI", "Portfolio Tracker", "Aktien News", "XETRA", "NASDAQ", "DAX"],
  authors: [{ name: "AlphaMetric" }],
  creator: "AlphaMetric",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: SITE_URL,
    siteName: "AlphaMetric",
    title: "AlphaMetric - Die Investment-Zentrale für Privatanleger",
    description: "Daily Brief, Top Movers, Aktiensuche, Metrio und Portfolio-Kontext in einer App.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AlphaMetric - Investment-Zentrale für Privatanleger",
    description: "Markt verstehen, Aktien prüfen und Portfolio einordnen.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
  ],
};

// Inline pre-paint script:
//  1) Apply theme before first paint (prevents wrong-theme flash).
//  2) If we already played the hero arrive animation in this session,
//     mark <html> with `am-arrived` so CSS skips the animation on
//     subsequent renders (covers React StrictMode, Suspense flicker,
//     SPA-back-navigation, anything that could cause a remount).
const themeScript = `(function(){
  var r=document.documentElement;
  try{
    r.removeAttribute('data-theme');
    r.style.colorScheme='light';
    r.style.background='#f6f6f3';
    localStorage.setItem('am-theme','light');
  }catch(e){}
  r.classList.add('am-loaded');
  r.classList.add('am-arrived');
  try{
    if(sessionStorage.getItem('am-hero-arrived')==='1'){
      r.classList.add('am-arrived');
    } else {
      // Mark as arrived once the longest hero arrive delay (≈1.6s) is past.
      setTimeout(function(){
        try{sessionStorage.setItem('am-hero-arrived','1');}catch(_){}
        r.classList.add('am-arrived');
      },1700);
    }
  }catch(_){r.classList.add('am-arrived');}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${spaceGrotesk.variable} am-loaded am-arrived`} style={{ colorScheme: "light", background: "#f6f6f3" }}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className}>
        {/* Curtain disabled — caused page-block under certain navigation types.
            Hero word-rise animation provides the brand moment without blocking. */}
        <ScrollToTop />
        <LiquidCursor />
        <Header />
        <MarketTicker />
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
