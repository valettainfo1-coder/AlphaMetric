"use client";

/**
 * PR share card — the primary viral loop. Rendered offscreen at
 * 1080×1350 (4:5 portrait), exported via html-to-image, shared through
 * the native share sheet with a download fallback.
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { formatDelta, formatLongDate, formatWeight } from "@/lib/format";
import { Button } from "@/components/ui/button";

export interface PrCardData {
  exerciseName: string;
  e1rmKg: number;
  deltaKg: number;
  date: Date;
}

export function PrShareCard({ data }: { data: PrCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const png = await toPng(node, { width: 1080, height: 1350, pixelRatio: 1 });
      const blob = await (await fetch(png)).blob();
      const file = new File([blob], "metricgym-pr.png", { type: "image/png" });
      track("report_shared", { kind: "pr_card" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "METRICGYM" });
      } else {
        const a = document.createElement("a");
        a.href = png;
        a.download = "metricgym-pr.png";
        a.click();
      }
    } catch {
      // Share sheet dismissed — not an error.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Preview (scaled down via CSS, exported at full 1080×1350) */}
      <div className="overflow-hidden rounded-card border border-border">
        <div className="origin-top-left scale-[0.3]" style={{ width: 1080, height: 405 }}>
          <CardArtwork data={data} refEl={cardRef} />
        </div>
      </div>
      <Button variant="primary" size="lg" onClick={share} disabled={busy}>
        {t("pr.share")}
      </Button>
    </div>
  );
}

function CardArtwork({
  data,
  refEl,
}: {
  data: PrCardData;
  refEl: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={refEl}
      style={{
        width: 1080,
        height: 1350,
        background: "#0A0A0B",
        color: "#F5F5F4",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 96,
        fontFamily: "'Inter Variable', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 40, letterSpacing: 8, color: "#9C9CA6" }}>
        {t("pr.cardTitle").toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 64, fontWeight: 600, marginBottom: 24 }}>{data.exerciseName}</div>
        <div
          style={{
            fontSize: 200,
            fontWeight: 700,
            lineHeight: 1,
            color: "#C8FF2E",
            fontFamily: "'JetBrains Mono Variable', monospace",
          }}
        >
          {formatWeight(data.e1rmKg)}
        </div>
        <div
          style={{
            fontSize: 56,
            marginTop: 24,
            color: "#C8FF2E",
            fontFamily: "'JetBrains Mono Variable', monospace",
          }}
        >
          {formatDelta(data.deltaKg)} kg {t("pr.cardE1rm")}
        </div>
        <div style={{ fontSize: 40, marginTop: 16, color: "#9C9CA6" }}>
          {formatLongDate(data.date)}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 4 }}>
          METRIC<span style={{ color: "#C8FF2E" }}>GYM</span>
        </div>
        <div style={{ fontSize: 32, color: "#6E6E78" }}>metricgym.app</div>
      </div>
    </div>
  );
}
