"use client";

/**
 * AI coach: GDPR Art. 9 consent gate → streaming chat with suggested
 * chips. Plain fetch + reader against /api/coach (Vercel AI SDK streams
 * server-side; the wire format is a plain text stream).
 */
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { getRepository } from "@/lib/data";
import { useRepoData } from "@/lib/hooks/use-repo";
import { buildCoachContext } from "@/lib/coach-context";
import { uuidv7 } from "@/lib/uuid";
import { track } from "@/lib/analytics";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const CHIPS = ["coach.chip1", "coach.chip2", "coach.chip3", "coach.chip4"] as const;

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: consent, loading, reload } = useRepoData(async (repo) =>
    repo.getConsent("ai_coach_gdpr"),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function grantConsent() {
    const repo = await getRepository();
    const now = new Date().toISOString();
    await repo.upsertConsent({
      id: uuidv7(),
      user_id: repo.userId,
      kind: "ai_coach_gdpr",
      granted: true,
      granted_at: now,
      updated_at: now,
    });
    reload();
  }

  async function send(text: string, fromChip: boolean) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setRateLimited(false);
    setInput("");
    track("coach_message_sent", { suggested_chip: fromChip });
    const userMsg: ChatMessage = { id: uuidv7(), role: "user", text };
    const assistantMsg: ChatMessage = { id: uuidv7(), role: "assistant", text: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    try {
      const repo = await getRepository();
      const context = await buildCoachContext(repo);
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context, clientId: repo.userId }),
      });
      if (response.status === 429) {
        setRateLimited(true);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const current = acc;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, text: current } : m)),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader title={t("coach.title")} />
        <div className="py-4">
          <Skeleton className="h-60" />
        </div>
      </>
    );
  }

  // GDPR Art. 9: explicit opt-in before any health data leaves the device.
  if (!consent?.granted) {
    return (
      <>
        <AppHeader title={t("coach.title")} />
        <div className="py-4">
          <Card>
            <CardTitle>{t("coach.consentTitle")}</CardTitle>
            <p className="mb-4 text-sm leading-relaxed text-text-2">{t("coach.consentBody")}</p>
            <div className="space-y-2">
              <Button variant="primary" size="lg" onClick={grantConsent}>
                {t("coach.consentAccept")}
              </Button>
              <p className="text-center text-xs text-text-2">{t("coach.disclaimer")}</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={t("coach.title")} />
      <div className="flex min-h-[70dvh] flex-col py-4">
        <div className="flex-1 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-text-2">{t("coach.disclaimer")}</p>
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((chipKey) => (
                  <button
                    key={chipKey}
                    type="button"
                    className="tap-target rounded-pill border border-border bg-surface-2 px-4 py-2 text-sm text-text-1 transition-colors duration-150 hover:border-volt/40"
                    onClick={() => void send(t(chipKey), true)}
                  >
                    {t(chipKey)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-card border px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-auto border-volt/30 bg-volt/10 text-text-1"
                  : "border-border bg-surface-1 text-text-1",
              )}
            >
              {m.text || <span className="text-text-3">…</span>}
            </div>
          ))}
          {rateLimited && <p className="text-sm text-danger">{t("coach.rateLimited")}</p>}
          <div ref={bottomRef} />
        </div>

        <form
          className="sticky bottom-24 mt-4 flex gap-2 md:bottom-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input, false);
          }}
        >
          <input
            className="h-12 flex-1 rounded-pill border border-border bg-surface-2 px-4 text-sm text-text-1 placeholder:text-text-3"
            placeholder={t("coach.inputPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <Button variant="primary" size="icon" type="submit" disabled={busy || !input.trim()} aria-label={t("common.continue")}>
            <Send size={18} />
          </Button>
        </form>
      </div>
    </>
  );
}
