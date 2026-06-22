"use client";

/**
 * Active workout session — persisted to IndexedDB so an in-progress
 * workout survives app kill, reload and device sleep.
 *
 * Rest timer contract: we store the absolute end timestamp (endsAt),
 * never a countdown — iOS throttles background JS, so the UI renders
 * the remaining time from Date.now() deltas.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlannedExercise } from "@/lib/engine/types";
import { idbStorage } from "./idb-storage";

export interface LoggedSet {
  id: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  completedAt: string;
}

export interface ActiveSession {
  workoutId: string;
  planId: string | null;
  weekIndex: number;
  dayIndex: number;
  label: string;
  isDeload: boolean;
  startedAt: string;
  exercises: PlannedExercise[];
}

interface WorkoutSessionState {
  session: ActiveSession | null;
  exerciseIndex: number;
  loggedSets: LoggedSet[];
  /** Absolute epoch ms when the current rest ends; null = no rest running. */
  restEndsAt: number | null;
  start(session: ActiveSession): void;
  logSet(set: LoggedSet): void;
  goToExercise(index: number): void;
  swapExercise(index: number, replacement: PlannedExercise): void;
  startRest(seconds: number): void;
  clearRest(): void;
  finish(): void;
}

export const useWorkoutSession = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      session: null,
      exerciseIndex: 0,
      loggedSets: [],
      restEndsAt: null,
      start: (session) =>
        set({ session, exerciseIndex: 0, loggedSets: [], restEndsAt: null }),
      logSet: (logged) => set({ loggedSets: [...get().loggedSets, logged] }),
      goToExercise: (index) => {
        const session = get().session;
        if (!session) return;
        const clamped = Math.max(0, Math.min(session.exercises.length - 1, index));
        set({ exerciseIndex: clamped });
      },
      swapExercise: (index, replacement) => {
        const session = get().session;
        if (!session) return;
        const exercises = session.exercises.map((e, i) => (i === index ? replacement : e));
        set({ session: { ...session, exercises } });
      },
      startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
      clearRest: () => set({ restEndsAt: null }),
      finish: () => set({ session: null, exerciseIndex: 0, loggedSets: [], restEndsAt: null }),
    }),
    {
      name: "workout-session",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
