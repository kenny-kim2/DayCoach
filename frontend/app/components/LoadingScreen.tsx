"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Task, AnalysisStep } from "@/app/lib/types";

interface LoadingScreenProps {
  step: AnalysisStep;
  parsedTasks: Task[];
}

const stepMessages: Record<string, string> = {
  parsing: "📋 작업 파악 중...",
  prioritizing: "🎯 우선순위 정하는 중...",
  planning: "📅 하루 계획 완성 중...",
};

export default function LoadingScreen({ step, parsedTasks }: LoadingScreenProps) {
  const message = stepMessages[step] || "분석 중...";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block text-4xl mb-4"
          >
            ⚙️
          </motion.div>
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold text-gray-700"
          >
            {message}
          </motion.p>
        </div>

        {parsedTasks.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">발견된 작업들:</p>
            <div className="space-y-2">
              <AnimatePresence>
                {parsedTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg"
                  >
                    <span className="text-blue-500">•</span>
                    <span className="text-gray-700 text-sm">{task.title}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex gap-1">
            {["parsing", "prioritizing", "planning"].map((s) => (
              <motion.div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  ["parsing", "prioritizing", "planning"].indexOf(step) >=
                  ["parsing", "prioritizing", "planning"].indexOf(s)
                    ? "bg-blue-500"
                    : "bg-gray-200"
                }`}
                animate={step === s ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
