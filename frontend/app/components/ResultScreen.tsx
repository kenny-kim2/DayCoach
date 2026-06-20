"use client";

import { motion } from "framer-motion";
import type { DayPlan, PrioritizedTask } from "@/app/lib/types";
import FirstActionBanner from "./FirstActionBanner";
import PriorityCard from "./PriorityCard";
import TimeBlockChart from "./TimeBlockChart";

interface ResultScreenProps {
  plan: DayPlan;
  onReset: () => void;
  startHour?: number;
  startMinute?: number;
}

function formatMinutes(mins: number): string {
  const m = isNaN(mins) || mins <= 0 ? 0 : Math.round(mins);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}시간 ${rem}분` : `${h}시간`;
}

export default function ResultScreen({ plan, onReset, startHour = 9, startMinute = 0 }: ResultScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-2xl mx-auto space-y-5"
    >
      {/* First Action Banner */}
      <FirstActionBanner
        taskTitle={plan.firstAction.taskTitle}
        why={plan.firstAction.why}
        howToStart={plan.firstAction.howToStart}
      />

      {/* Motivational Message */}
      {plan.motivationalMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-gray-500 text-sm italic"
        >
          💬 {plan.motivationalMessage}
        </motion.div>
      )}

      {/* Today Tasks */}
      {plan.todayTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            📌 오늘 할 일
            <span className="text-sm font-normal text-gray-400">
              {plan.todayTasks.length}개 · 예상 {formatMinutes(plan.totalEstimatedMinutes)}
            </span>
          </h3>
          <div className="space-y-3">
            {plan.todayTasks.map((task: PrioritizedTask, i: number) => (
              <PriorityCard key={task.id} task={task} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Time Blocks */}
      <TimeBlockChart timeBlocks={plan.timeBlocks} startHour={startHour} startMinute={startMinute} />

      {/* Deferred Tasks */}
      {plan.deferredTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-50 rounded-2xl border border-gray-200 p-5"
        >
          <h3 className="font-semibold text-gray-600 mb-3 flex items-center gap-2">
            🗓 나중에 해도 되는 일
            <span className="text-sm font-normal text-gray-400">
              ({plan.deferredTasks.length}개)
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {plan.deferredTasks.map((task: PrioritizedTask) => (
              <span
                key={task.id}
                className="text-sm bg-white text-gray-600 px-3 py-1.5 rounded-full border border-gray-200"
              >
                {task.title}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Reset Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onReset}
        className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-lg rounded-xl border-2 border-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
      >
        🔄 다시 분석
      </motion.button>
    </motion.div>
  );
}
