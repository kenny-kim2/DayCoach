"use client";

import { motion } from "framer-motion";
import type { TimeBlock } from "@/app/lib/types";

interface TimeBlockChartProps {
  timeBlocks: TimeBlock[];
  startHour?: number;
  startMinute?: number;
}

// 자유 시간으로 표시할 최소 간격 (분)
const FREE_TIME_MIN_GAP = 10;

const COLORS = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
];

function formatTime(baseHour: number, baseMinute: number, offsetMins: number): string {
  const safeOffset = isNaN(offsetMins) ? 0 : offsetMins;
  const totalMins = baseHour * 60 + baseMinute + safeOffset;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(mins: number): string {
  const m = isNaN(mins) || mins <= 0 ? 0 : Math.round(mins);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

type DisplayBlock =
  | { type: "task"; block: TimeBlock; colorIndex: number }
  | { type: "free"; startOffset: number; durationMinutes: number };

/** 태스크 블록 사이의 빈 시간을 자유 시간 블록으로 채운다 */
function buildDisplayBlocks(timeBlocks: TimeBlock[]): DisplayBlock[] {
  const sorted = [...timeBlocks].sort((a, b) => a.startOffset - b.startOffset);
  const result: DisplayBlock[] = [];
  let colorIdx = 0;
  let cursor = sorted[0]?.startOffset ?? 0;

  for (const block of sorted) {
    const gap = block.startOffset - cursor;
    if (gap >= FREE_TIME_MIN_GAP) {
      result.push({ type: "free", startOffset: cursor, durationMinutes: gap });
    }
    result.push({ type: "task", block, colorIndex: colorIdx++ });
    cursor = block.startOffset + block.durationMinutes;
  }
  return result;
}

export default function TimeBlockChart({ timeBlocks, startHour = 9, startMinute = 0 }: TimeBlockChartProps) {
  if (!timeBlocks || timeBlocks.length === 0) return null;

  const displayBlocks = buildDisplayBlocks(timeBlocks);
  const totalMins = timeBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
  const maxWidth = Math.max(...timeBlocks.map((b) => b.durationMinutes), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        🕐 오늘의 시간 블록
        <span className="text-sm font-normal text-gray-400">
          (총 {formatDuration(totalMins)})
        </span>
      </h3>

      <div className="space-y-3">
        {displayBlocks.map((item, i) => {
          if (item.type === "free") {
            const widthPct = Math.max((item.durationMinutes / maxWidth) * 100, 10);
            return (
              <motion.div
                key={`free-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="flex items-center gap-3"
              >
                <span className="text-xs text-gray-400 w-12 text-right font-mono">
                  {formatTime(startHour, startMinute, item.startOffset)}
                </span>
                <div className="flex-1">
                  <div
                    className="bg-gray-100 border border-dashed border-gray-300 rounded-full h-7 flex items-center px-3"
                    style={{ width: `${widthPct}%`, minWidth: "80px" }}
                  >
                    <span className="text-gray-400 text-xs truncate">✨ 자유 시간</span>
                  </div>
                </div>
                <span className="text-xs text-gray-300 w-10">
                  {formatDuration(item.durationMinutes)}
                </span>
              </motion.div>
            );
          }

          const { block, colorIndex } = item;
          const widthPct = Math.max((block.durationMinutes / maxWidth) * 100, 10);
          const color = COLORS[colorIndex % COLORS.length];

          return (
            <motion.div
              key={block.taskId + i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs text-gray-500 w-12 text-right font-mono">
                {formatTime(startHour, startMinute, block.startOffset)}
              </span>
              <div className="flex-1">
                <div
                  className={`${color} rounded-full h-7 flex items-center px-3 transition-all duration-500`}
                  style={{ width: `${widthPct}%`, minWidth: "80px" }}
                >
                  <span className="text-white text-xs font-medium truncate">
                    {block.taskTitle}
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 w-10">
                {formatDuration(block.durationMinutes)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
