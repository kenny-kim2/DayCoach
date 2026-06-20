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

/**
 * 현재 시각 기준 다음 식사 시간대를 계산합니다.
 * 반환값: { mealName, targetHour, targetMinute }
 */
function getNextMealInfo(currentHour: number, currentMinute: number): {
  name: string;
  hour: number;
  minute: number;
  offsetFromNow: number;
}[] {
  const nowMins = currentHour * 60 + currentMinute;
  const meals = [
    { name: "아침 식사", hour: 8, minute: 0 },
    { name: "점심 식사", hour: 12, minute: 0 },
    { name: "저녁 식사", hour: 18, minute: 30 },
  ];
  return meals
    .map((m) => {
      const mealMins = m.hour * 60 + m.minute;
      const offsetFromNow = mealMins - nowMins;
      return { ...m, offsetFromNow };
    })
    .filter((m) => m.offsetFromNow > -60); // 이미 1시간 이상 지난 식사는 제외
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

  const upcomingMeals = getNextMealInfo(currentHour, currentMinute);
  const mealScheduleHint = upcomingMeals.length > 0
    ? upcomingMeals.map((m) => {
        const absH = (currentHour * 60 + currentMinute + Math.max(m.offsetFromNow, 0));
        const h = Math.floor(absH / 60) % 24;
        const min = absH % 60;
        const timeStr = `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
        if (m.offsetFromNow <= 0) return `  - ${m.name}: 현재 시간대 (지금 바로 또는 직후에 배치)`;
        return `  - ${m.name}: 약 ${timeStr}에 배치 권장 (지금으로부터 ${m.offsetFromNow}분 후)`;
      }).join("\n")
    : "  - 해당 없음 (저녁 식사 이후)";

  return `You are DayCoach, a personal productivity AI assistant that understands human daily life patterns.

Current time: ${nowStr} (available until approximately ${endStr}, ${availableHours} hours)

## Life Pattern Rules (MUST follow these for realistic scheduling)

### 1. Meal Time Rules
Meals are NON-NEGOTIABLE — they must be placed at biologically appropriate times:
${mealScheduleHint}
- 아침/점심/저녁 식사는 반드시 위 시간대에 고정 배치. 다른 업무 때문에 식사 시간을 뒤로 미루지 말 것.
- If the user mentions "밥 먹기", "식사", "점심", "저녁", "아침" — map it to the nearest upcoming meal time above.
- Meal duration: 아침 20–30분, 점심 30–45분, 저녁 30–60분.

### 2. Activity Category Priority Weights
When scheduling, apply these weights BEFORE urgency/importance:

| Category | Time-of-day preference | Priority weight |
|----------|----------------------|-----------------|
| 업무/공부 (work) | 오전~오후 (09:00–17:00) | +2 (highest) |
| 건강/운동 (health) | 오전 또는 저녁 | +1 |
| 집안일 (admin: 빨래, 청소, 설거지 등) | 업무 사이 짬, 또는 저녁 | 0 |
| 개인/사무 (personal) | 오전~오후 | 0 |
| 여가/오락 (취미, 게임, TV, 유튜브 등) | 저녁 이후 (20:00~) | -1 (lowest) |

### 3. Scheduling Rules
- Work/study tasks: schedule FIRST during productive hours (09:00–17:00)
- Exercise: best in morning or evening, NOT during core work hours
- Household chores (빨래, 청소, 설거지): schedule in gaps between work tasks or after dinner
- Leisure/entertainment (게임, 유튜브, TV 시청 등): schedule ONLY after work/chores are done, ideally evening (20:00+)
- Meals: anchored at their designated time — never pushed back for chores or leisure

### 4. Urgency Rules Based on Time
- 현재 시각이 ${nowStr}이므로, 마감 없는 여가 항목의 urgency는 "this-week" 또는 "someday"로 설정
- 집안일(admin)이 식사보다 먼저 나오면 안 됨 — 식사 시간을 침범하지 않도록 배치

## Tasks to Process

The user's input has been pre-parsed into ${preParsedItems.length} task item(s):
${itemList}

## Instructions

1. Call parse_tasks with the pre-identified items above.
   - For each item, decompose into specific, actionable subtasks (each completable in 15–90 min).
   - Use action verbs (e.g., "작성하다", "검토하다", "연락하다", "정리하다").
   - Examples of good decomposition:
     * "보고서 작성" → ["보고서 목차 및 구조 잡기", "필요 데이터 수집 및 정리", "보고서 초안 작성", "검토 및 최종 수정"]
     * "이메일 확인" → ["미읽음 이메일 분류 및 긴급 건 확인", "필요한 이메일 답장 작성"]
     * "운동하기" → ["운동 준비 및 이동", "본 운동 (스트레칭 포함)", "샤워 및 정리"]
   - Meals: keep as a single task, set category="health", estimatedMinutes per meal norms above.
   - Leisure tasks: keep as 1 task, category="personal", urgency="this-week" or "someday" unless user explicitly says "오늘".
   - Simple one-step tasks can remain as-is.
   - Aim for 2–5 subtasks per complex task; simple tasks stay as 1.
   - Set rawText to the original item it was derived from.

2. Call prioritize_tasks applying the Life Pattern Rules above.
   - priority for meals: always "high" (non-negotiable biological need)
   - priority for leisure/gaming: "low" unless user says it's urgent
   - estimatedMinutes for meals: follow the meal duration norms above
   - reason: briefly explain scheduling rationale based on life pattern

3. Call build_day_plan to create time blocks starting from NOW (${nowStr}).
   - The first time block's startOffset MUST be 0 (= ${nowStr}).
   - Each subsequent block's startOffset = previous block's startOffset + previous block's durationMinutes.
   - Do NOT start from 09:00. Start from the current time ${nowStr}.
   - Place meals at their anchored times (see Meal Time Rules above) — use the correct startOffset to hit those times.
   - Schedule work/study tasks BEFORE leisure tasks in the timeline.
   - Leisure tasks should appear at the END of the day plan (evening).
   - Identify the single most important first action the user should take RIGHT NOW.

Always provide reasoning for your prioritization.
Be concise, practical, and encouraging.
If input is in Korean, respond in Korean.

Original raw input (for reference):
"""
${userInput}
"""`;
}
