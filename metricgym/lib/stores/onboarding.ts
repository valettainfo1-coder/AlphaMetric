"use client";

/**
 * Onboarding wizard state — persisted to IndexedDB so the quiz survives
 * reloads (value before identity: no account exists yet at this point).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AssessmentInput } from "@/lib/engine/types";
import { idbStorage } from "./idb-storage";

export type OnboardingAnswers = Partial<AssessmentInput> & {
  medicalConsent?: boolean;
  medicalConsentAt?: string;
};

interface OnboardingState {
  stepIndex: number;
  answers: OnboardingAnswers;
  revealed: boolean;
  setStep(index: number): void;
  setAnswers(patch: OnboardingAnswers): void;
  setRevealed(revealed: boolean): void;
  reset(): void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      stepIndex: 0,
      answers: {},
      revealed: false,
      setStep: (stepIndex) => set({ stepIndex }),
      setAnswers: (patch) => set({ answers: { ...get().answers, ...patch } }),
      setRevealed: (revealed) => set({ revealed }),
      reset: () => set({ stepIndex: 0, answers: {}, revealed: false }),
    }),
    {
      name: "onboarding",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
