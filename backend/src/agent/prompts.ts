/**
 * 자유형식 텍스트에서 개별 할 일 항목을 분리합니다.
 * "밥 먹어야 되고 보고서 써야 돼" → ["밥 먹어야 됨", "보고서 써야 됨"]
 */
export function preParseInput(raw: string): string[] {
  const normalized = raw.trim();

  // 줄바꿈, 쉼표, 불릿 기호로 먼저 분리
  let parts = normalized.split(/[\n\r,，、]+/g);

  // 줄바꿈/쉼표로 분리가 안 된 경우 한국어 접속 어미로 추가 분리
  if (parts.length === 1) {
    parts = normalized.split(
      /\s+(?:하고|되고|이고|고\s|그리고|이랑|랑|와\s|과\s|또한|또\s)\s*/g
    );
  }

  const items = parts
    .map((s) => s.replace(/^[-•*\d.]+\s*/, "").trim()) // 불릿/번호 제거
    .filter((s) => s.length >= 2);

  return items.length > 1 ? items : [normalized];
}

export function buildSystemPrompt(
  userInput: string,
  preParsedItems: string[],
  currentHour: number = 9,
  currentMinute: number = 0,
  availableHours: number = 8,
): string {
  const itemList = preParsedItems.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const nowStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
  const endHour = currentHour + availableHours;
  const endStr = `${String(endHour % 24).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  return `You are DayCoach, a personal productivity AI assistant.

Current time: ${nowStr} (available until approximately ${endStr}, ${availableHours} hours)

The user's input has been pre-parsed into ${preParsedItems.length} task item(s):
${itemList}

Your job is to:
1. Call parse_tasks with the pre-identified items above.
   - For each item, decompose into specific, actionable subtasks (each completable in 15–90 min).
   - Use action verbs (e.g., "작성하다", "검토하다", "연락하다", "정리하다").
   - Examples of good decomposition:
     * "보고서 작성" → ["보고서 목차 및 구조 잡기", "필요 데이터 수집 및 정리", "보고서 초안 작성", "검토 및 최종 수정"]
     * "이메일 확인" → ["미읽음 이메일 분류 및 긴급 건 확인", "필요한 이메일 답장 작성"]
     * "운동하기" → ["운동 준비 및 이동", "본 운동 (스트레칭 포함)", "샤워 및 정리"]
   - Simple one-step tasks can remain as-is (e.g., "점심 약속" is fine as one task).
   - Aim for 2–5 subtasks per complex task; simple tasks stay as 1.
   - Set rawText to the original item it was derived from.

2. Call prioritize_tasks to assign priority (high/medium/low), estimated duration (minutes), category (work/personal/health/admin/other), urgency (today/this-week/someday), and a one-sentence reason for each subtask.

3. Call build_day_plan to create time blocks starting from NOW (${nowStr}).
   - The first time block's startOffset MUST be 0 (= ${nowStr}).
   - Each subsequent block's startOffset = previous block's startOffset + previous block's durationMinutes.
   - Do NOT start from 09:00. Start from the current time ${nowStr}.
   - Identify the single most important first action the user should take RIGHT NOW.

Always provide reasoning for your prioritization.
Be concise, practical, and encouraging.
If input is in Korean, respond in Korean.

Original raw input (for reference):
"""
${userInput}
"""`;
}
