import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// LIVE NEWS ENDPOINT — EPIC 5: Real-time financial news
// ═══════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json({ news: [] });

  // Try Finnhub company news
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (key && key !== "your_api_key_here") {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const from = weekAgo.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      const res = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`,
        { next: { revalidate: 300 } }
      );

      if (res.ok) {
        const data = await res.json();
        const news = (data ?? []).slice(0, 8).map((n: {
          headline?: string; summary?: string; url?: string;
          source?: string; datetime?: number; image?: string;
        }) => ({
          title: n.headline ?? "",
          summary: (n.summary ?? "").slice(0, 200),
          url: n.url ?? "",
          source: n.source ?? "",
          time: n.datetime ? new Date(n.datetime * 1000).toISOString() : "",
          image: n.image ?? "",
        }));

        if (news.length > 0) {
          return NextResponse.json({ news, source: "finnhub" });
        }
      }
    }
  } catch { /* fall through */ }

  // Fallback: return empty (client will show placeholder)
  return NextResponse.json({ news: [], source: "none" });
}
