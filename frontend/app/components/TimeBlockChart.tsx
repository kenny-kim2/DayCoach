"use client";

import { motion } from "framer-motion";
import type { TimeBlock } from "@/app/lib/types";

interface TimeBlockChartProps {
  timeBlocks: TimeBlock[];
  startHour?: number;
  startMinute?: number;
}

const FREE_TIME_MIN_GAP = 10;
const FREE_TIME_MAX_PCT = 50;

const COLORS = ["bg-blue-500","bg-indigo-500","bg-purple-500","bg-pink-500","bg-orange-500","bg-teal-500"];
const COLOR_BORDERS = ["border-blue-400","border-indigo-400","border-purple-400","border-pink-400","border-orange-400","border-teal-400"];
const COLOR_TEXT = ["text-blue-600","text-indigo-600","text-purple-600","text-pink-600","text-orange-600","text-teal-600"];

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
  const taskMaxWidth = Math.max(...timeBlocks.map((b) => b.durationMinutes), 1);

  const rawTextCount = new Map<string, number>();
  for (const item of displayBlocks) {
    if (item.type === "task" && item.block.rawText) {
      rawTextCount.set(item.block.rawText, (rawTextCount.get(item.block.rawText) ?? 0) + 1);
    }
  }

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

      <div className="space-y-1 overflow-hidden">
        {displayBlocks.map((item, i) => {
          if (item.type === "free") {
            const widthPct = Math.min(Math.max((item.durationMinutes / taskMaxWidth) * 100, 15), FREE_TIME_MAX_PCT);
            return (
              <motion.div
                key={`free-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="text-xs text-gray-400 w-12 text-right font-mono shrink-0">
                  {formatTime(startHour, startMinute, item.startOffset)}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div
                    className="h-1.5 bg-gray-200 rounded-full shrink-0"
                    style={{ width: `${widthPct}%`, maxWidth: "50%" }}
                  />
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    ✨ 자유 시간 · {formatDuration(item.durationMinutes)}
                  </span>
                </div>
              </motion.div>
            );
          }

          const { block, colorIndex } = item;
          const widthPct = Math.min(Math.max((block.durationMinutes / taskMaxWidth) * 100, 8), 100);
          const color = COLORS[colorIndex % COLORS.length];
          const borderColor = COLOR_BORDERS[colorIndex % COLOR_BORDERS.length];
          const textColor = COLOR_TEXT[colorIndex % COLOR_TEXT.length];
          const isSplit = block.rawText ? (rawTextCount.get(block.rawText) ?? 0) > 1 : false;

          return (
            <motion.div
              key={block.taskId + i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              className="flex gap-3 py-2"
            >
              <span className="text-xs text-gray-500 w-12 text-right font-mono shrink-0 pt-0.5">
                {formatTime(startHour, startMinute, block.startOffset)}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`${color} h-1.5 rounded-full mb-1.5`}
                  style={{ width: `${widthPct}%`, maxWidth: "100%" }}
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-sm font-medium ${textColor}`}>
                    {block.taskTitle}
                  </span>
                  {isSplit && (
                    <span className={`text-[10px] border ${borderColor} ${textColor} rounded px-1 opacity-70`}>
                      연속 작업
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {formatDuration(block.durationMinutes)}
                  </span>
                </div>
                {block.reason && (
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {block.reason}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
