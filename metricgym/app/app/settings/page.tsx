"use client";

/**
 * Settings: profile, units, consent management, JSON export (Art. 20),
 * cascade account deletion (Art. 17).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { getRepository, isDemoMode } from "@/lib/data";
import { useRepoData } from "@/lib/hooks/use-repo";
import { uuidv7 } from "@/lib/uuid";
import { formatLongDate } from "@/lib/format";

export default function SettingsPage() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, loading, reload } = useRepoData(async (repo) => {
    const [profile, medical, coach] = await Promise.all([
      repo.getProfile(),
      repo.getConsent("medical_disclaimer"),
      repo.getConsent("ai_coach_gdpr"),
    ]);
    return { profile, medical, coach };
  });

  async function setUnits(units: "kg" | "lbs") {
    const repo = await getRepository();
    const existing = await repo.getProfile();
    const now = new Date().toISOString();
    await repo.upsertProfile({
      id: repo.userId,
      display_name: existing?.display_name ?? "",
      units,
      locale: "de",
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    reload();
  }

  async function revokeCoachConsent() {
    const repo = await getRepository();
    const now = new Date().toISOString();
    await repo.upsertConsent({
      id: uuidv7(),
      user_id: repo.userId,
      kind: "ai_coach_gdpr",
      granted: false,
      granted_at: now,
      updated_at: now,
    });
    reload();
  }

  async function exportJson() {
    const repo = await getRepository();
    const payload = await repo.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricgym-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    const repo = await getRepository();
    await repo.deleteAllData();
    router.push("/");
  }

  return (
    <>
      <AppHeader title={t("settings.title")} />
      <div className="space-y-4 py-4">
        {loading && <Skeleton className="h-60" />}
        {!loading && data && (
          <>
            <Card>
              <CardTitle>{t("settings.profile")}</CardTitle>
              <p className="mb-3 text-sm text-text-1">{data.profile?.display_name || "—"}</p>
              {isDemoMode() && <p className="text-xs text-text-2">{t("settings.demoNote")}</p>}
            </Card>

            <Card>
              <CardTitle>{t("settings.units")}</CardTitle>
              <div className="flex rounded-pill border border-border bg-surface-2 p-1">
                {(["kg", "lbs"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    aria-pressed={(data.profile?.units ?? "kg") === unit}
                    onClick={() => void setUnits(unit)}
                    className={cn(
                      "tap-target flex-1 rounded-pill text-sm font-medium transition-colors duration-150",
                      (data.profile?.units ?? "kg") === unit ? "bg-volt text-bg" : "text-text-2",
                    )}
                  >
                    {t(unit === "kg" ? "common.kg" : "common.lbs")}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>{t("settings.consents")}</CardTitle>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-text-1">{t("settings.consentMedical")}</span>
                  <span className="text-xs text-text-2">
                    {data.medical?.granted
                      ? t("settings.consentGranted", {
                          date: formatLongDate(data.medical.granted_at),
                        })
                      : t("settings.consentNotGranted")}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-text-1">{t("settings.consentCoach")}</span>
                  {data.coach?.granted ? (
                    <Button variant="ghost" size="sm" onClick={revokeCoachConsent}>
                      {t("settings.consentRevoke")}
                    </Button>
                  ) : (
                    <span className="text-xs text-text-2">{t("settings.consentNotGranted")}</span>
                  )}
                </li>
              </ul>
            </Card>

            <Card>
              <CardTitle>{t("settings.export")}</CardTitle>
              <p className="mb-3 text-xs text-text-2">{t("settings.exportHint")}</p>
              <Button variant="secondary" onClick={exportJson}>
                {t("settings.export")}
              </Button>
            </Card>

            <Card className="border-danger/30">
              <CardTitle className="text-danger">{t("settings.deleteAccount")}</CardTitle>
              <p className="mb-3 text-xs text-text-2">{t("settings.deleteHint")}</p>
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-sm text-danger">{t("settings.deleteConfirm")}</p>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={deleteAccount}>
                      {t("common.delete")}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  {t("settings.deleteAccount")}
                </Button>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
