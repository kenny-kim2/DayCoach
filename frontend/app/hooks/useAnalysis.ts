"use client";

import { useState, useCallback, useRef } from "react";
import type { Task, PrioritizedTask, DayPlan, AnalysisStep } from "@/app/lib/types";

export interface AnalysisState {
  step: AnalysisStep;
  parsedTasks: Task[];
  prioritizedTasks: PrioritizedTask[];
  dayPlan: DayPlan | null;
  error: string | null;
  startHour: number;
  startMinute: number;
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    step: "idle",
    parsedTasks: [],
    prioritizedTasks: [],
    dayPlan: null,
    error: null,
    startHour: new Date().getHours(),
    startMinute: new Date().getMinutes(),
  });

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState({ step: "idle", parsedTasks: [], prioritizedTasks: [], dayPlan: null, error: null, startHour: new Date().getHours(), startMinute: new Date().getMinutes() });
  }, []);

  const analyze = useCallback(async (input: string, availableHours: number = 8) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const now = new Date();
    const startHour = now.getHours();
    const startMinute = now.getMinutes();

    setState({
      step: "parsing",
      parsedTasks: [],
      prioritizedTasks: [],
      dayPlan: null,
      error: null,
      startHour,
      startMinute,
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, availableHours, currentHour: startHour, currentMinute: startMinute }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "분석 중 오류가 발생했습니다." }));
        throw new Error(err.message || "분석 중 오류가 발생했습니다.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트리밍을 지원하지 않는 브라우저입니다.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === "tasks_parsed") {
              setState((prev) => ({ ...prev, step: "prioritizing", parsedTasks: event.tasks }));
            } else if (event.type === "tasks_prioritized") {
              setState((prev) => ({ ...prev, step: "planning", prioritizedTasks: event.tasks }));
            } else if (event.type === "day_plan") {
              setState((prev) => ({ ...prev, dayPlan: event.plan }));
            } else if (event.type === "done") {
              setState((prev) => ({ ...prev, step: "done" }));
            } else if (event.type === "error") {
              setState((prev) => ({ ...prev, step: "error", error: event.message }));
            }
          } catch {
            // non-JSON line, skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        step: "error",
        error: err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ step: "idle", parsedTasks: [], prioritizedTasks: [], dayPlan: null, error: null, startHour: new Date().getHours(), startMinute: new Date().getMinutes() });
  }, []);

  return { state, analyze, reset, cancel };
}
