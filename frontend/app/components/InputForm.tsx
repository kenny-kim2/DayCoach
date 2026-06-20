"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface InputFormProps {
  onSubmit: (input: string, availableHours: number) => void;
  isLoading?: boolean;
}

export default function InputForm({ onSubmit, isLoading = false }: InputFormProps) {
  const [input, setInput] = useState("");
  const [hours, setHours] = useState(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim(), hours);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🧠 DayCoach
        </h1>
        <p className="text-lg text-gray-500">오늘 해야 할 일을 모두 쏟아내세요</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="오늘 보고서 마감인데 아직 반도 못 썼고, 친구한테 연락도 해야 하고, 운동도 하고 싶고... 뭐든 자유롭게 쏟아내세요!"
          className="w-full h-48 p-4 text-gray-800 bg-gray-50 rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base leading-relaxed placeholder:text-gray-400"
          disabled={isLoading}
        />

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            오늘 사용 가능한 시간:
          </label>
          <input
            type="number"
            min={1}
            max={24}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-16 px-3 py-1.5 text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">시간</span>
        </div>

        <motion.button
          type="submit"
          disabled={!input.trim() || isLoading}
          whileHover={{ scale: input.trim() && !isLoading ? 1.02 : 1 }}
          whileTap={{ scale: input.trim() && !isLoading ? 0.98 : 1 }}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
        >
          🚀 오늘 계획 만들기
        </motion.button>
      </form>
    </motion.div>
  );
}
