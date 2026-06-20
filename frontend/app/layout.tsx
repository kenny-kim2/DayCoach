import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DayCoach — 오늘의 AI 비서",
  description: "머릿속 혼돈을 오늘의 실행 계획으로. 할 일을 자유롭게 입력하면 AI가 실행 가능한 하루 계획으로 정리해 드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50">{children}</body>
    </html>
  );
}
