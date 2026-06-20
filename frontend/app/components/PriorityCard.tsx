"use client";

import { motion } from "framer-motion";
import type { PrioritizedTask } from "@/app/lib/types";

const priorityConfig = {
  high: { icon: "🔴", label: "상", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  medium: { icon: "🟡", label: "중", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  low: { icon: "🟢", label: "하", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
};

const categoryLabel: Record<string, string> = {
  work: "💼 업무",
  personal: "👤 개인",
  health: "💪 건강",
  admin: "📋 행정",
  other: "📌 기타",
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

interface PriorityCardProps {
  task: PrioritizedTask;
  index: number;
}

export default function PriorityCard({ task, index }: PriorityCardProps) {
  const cfg = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
    >
      <div className={`flex flex-col items-center min-w-[2.5rem] pt-0.5`}>
        <span className="text-lg">{cfg.icon}</span>
        <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-800 leading-snug">{task.title}</p>
          <span className="text-sm text-gray-500 whitespace-nowrap font-medium">
            {formatMinutes(task.estimatedMinutes)}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 italic">"{task.reason}"</p>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-white/80 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
            {categoryLabel[task.category] ?? task.category}
          </span>
          {task.urgency === "today" && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              오늘 필수
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
