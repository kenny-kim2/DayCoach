"use client";

import { AnimatePresence } from "framer-motion";
import { useAnalysis } from "@/app/hooks/useAnalysis";
import InputForm from "@/app/components/InputForm";
import LoadingScreen from "@/app/components/LoadingScreen";
import ResultScreen from "@/app/components/ResultScreen";

export default function Home() {
  const { state, analyze, reset, cancel } = useAnalysis();

  const showInput = state.step === "idle" || state.step === "error";
  const showLoading = state.step === "parsing" || state.step === "prioritizing" || state.step === "planning";
  const showResult = state.step === "done" && state.dayPlan !== null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <AnimatePresence mode="wait">
        {showInput && (
          <InputForm
            key="input"
            onSubmit={analyze}
            isLoading={false}
          />
        )}

        {showLoading && (
          <LoadingScreen
            key="loading"
            step={state.step}
            parsedTasks={state.parsedTasks}
            onCancel={cancel}
          />
        )}

        {showResult && (
          <ResultScreen
            key="result"
            plan={state.dayPlan!}
            onReset={reset}
            startHour={state.startHour}
            startMinute={state.startMinute}
          />
        )}
      </AnimatePresence>

      {state.step === "error" && state.error && (
        <div className="mt-4 w-full max-w-2xl bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
          ⚠️ {state.error}
        </div>
      )}
    </main>
  );
}
