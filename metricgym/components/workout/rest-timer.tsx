"use client";

/**
 * Rest timer — timestamp-based. We store the absolute end time and render
 * from Date.now() deltas; setInterval-accumulated countdowns drift badly
 * because iOS throttles background JS. Visual pulse at zero (no haptics —
 * unavailable in iOS PWAs); optional audio cue unlocked on first gesture.
 */
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { formatSeconds } from "@/lib/format";
import { Button } from "@/components/ui/button";

let audioCtx: AudioContext | null = null;

/** Must be called from a user gesture once to unlock audio on iOS. */
export function unlockAudio(): void {
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!audioCtx && Ctor) audioCtx = new Ctor();
    void audioCtx?.resume();
  } catch {
    audioCtx = null;
  }
}

function beep(): void {
  if (!audioCtx || audioCtx.state !== "running") return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

export function RestTimer({
  endsAt,
  onDone,
  onSkip,
}: {
  endsAt: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()) / 1000);
  const doneFired = useRef(false);

  useEffect(() => {
    doneFired.current = false;
    let raf = 0;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) {
        if (!doneFired.current) {
          doneFired.current = true;
          beep();
          onDone();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, onDone]);

  const finished = remaining <= 0;
  return (
    <div className="flex items-center justify-between rounded-card border border-border bg-surface-2 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-text-2">{t("player.restTimer")}</p>
        <p
          className={`metric text-3xl font-semibold ${finished ? "text-volt pulse-volt" : "text-text-1"}`}
          aria-live="polite"
        >
          {formatSeconds(remaining)}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onSkip}>
        {t("player.restSkip")}
      </Button>
    </div>
  );
}
