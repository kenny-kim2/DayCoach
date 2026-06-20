"use client";

import { motion } from "framer-motion";

interface FirstActionBannerProps {
  taskTitle: string;
  why: string;
  howToStart: string;
}

export default function FirstActionBanner({ taskTitle, why, howToStart }: FirstActionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">⚡</span>
        <h2 className="text-lg font-bold tracking-wide uppercase opacity-90">
          지금 당장 할 첫 행동
        </h2>
      </div>

      <p className="text-2xl font-bold mb-3">📄 {taskTitle}</p>

      <div className="bg-white/20 rounded-xl p-4 space-y-2">
        <p className="text-sm opacity-90">
          <span className="font-semibold">왜:</span> {why}
        </p>
        <p className="text-sm opacity-90">
          <span className="font-semibold">시작 방법:</span> {howToStart}
        </p>
      </div>
    </motion.div>
  );
}
