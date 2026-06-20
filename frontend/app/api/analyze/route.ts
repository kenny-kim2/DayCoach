import type { Task, PrioritizedTask, DayPlan } from "@/app/lib/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function encode(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Mock API route for development/demo when backend is unavailable
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input: string = body.input || "";
  const availableHours: number = body.availableHours ?? 8;

  if (!input.trim()) {
    return Response.json(
      { error: "input_required", message: "입력 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  // Parse sentences/lines into tasks
  const lines = input
    .split(/[,\.。\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const parsedTasks: Task[] = lines.slice(0, 8).map((line, i) => ({
    id: `task-${i + 1}`,
    title: line,
    rawText: line,
  }));

  const priorities: Array<"high" | "medium" | "low"> = ["high", "high", "medium", "medium", "low", "low", "low", "low"];
  const categories: Array<"work" | "personal" | "health" | "admin"> = ["work", "admin", "personal", "health", "work", "personal", "admin", "health"];
  const urgencies: Array<"today" | "this-week" | "someday"> = ["today", "today", "today", "this-week", "this-week", "someday", "someday", "someday"];
  const reasons = [
    "마감이 가장 급합니다. 지금 바로 시작하세요.",
    "업무 연속성에 중요한 작업입니다.",
    "빠르게 처리할 수 있는 작업입니다.",
    "이번 주 안에 완료하면 충분합니다.",
    "중요하지만 오늘 당장은 아닙니다.",
    "나중에 여유 있을 때 처리해도 됩니다.",
    "우선순위가 낮아 미뤄도 됩니다.",
    "이번 달 안으로 처리하면 충분합니다.",
  ];

  const prioritizedTasks: PrioritizedTask[] = parsedTasks.map((t, i) => ({
    ...t,
    priority: priorities[i] ?? "low",
    estimatedMinutes: [120, 20, 30, 90, 15, 60, 10, 45][i] ?? 30,
    category: categories[i] ?? "other",
    urgency: urgencies[i] ?? "someday",
    reason: reasons[i] ?? "일반적인 우선순위입니다.",
  }));

  const todayTasks = prioritizedTasks.filter((t) => t.urgency === "today");
  const deferredTasks = prioritizedTasks.filter((t) => t.urgency !== "today");

  const totalToday = todayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);

  let offset = 0;
  const timeBlocks = todayTasks.map((t) => {
    const block = { startOffset: offset, durationMinutes: t.estimatedMinutes, taskId: t.id, taskTitle: t.title };
    offset += t.estimatedMinutes + 10;
    return block;
  });

  const dayPlan: DayPlan = {
    firstAction: {
      taskId: todayTasks[0]?.id ?? parsedTasks[0]?.id ?? "task-1",
      taskTitle: todayTasks[0]?.title ?? parsedTasks[0]?.title ?? "첫 번째 작업",
      why: "가장 급하고 중요한 작업입니다. 지금 시작하면 나머지가 훨씬 수월해집니다.",
      howToStart: "지금 바로 파일을 열고 첫 문단부터 시작해보세요. 5분만 시작해도 됩니다.",
    },
    todayTasks,
    deferredTasks,
    timeBlocks,
    totalEstimatedMinutes: totalToday,
    motivationalMessage: `오늘 ${availableHours}시간 동안 ${todayTasks.length}개의 중요한 일을 해낼 수 있어요. 한 번에 하나씩!`,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(new TextEncoder().encode(encode(data)));
        } catch {
          // client disconnected
        }
      };

      await sleep(800);
      send({ type: "tasks_parsed", tasks: parsedTasks });

      await sleep(1200);
      send({ type: "tasks_prioritized", tasks: prioritizedTasks });

      await sleep(1000);
      send({ type: "day_plan", plan: dayPlan });

      await sleep(300);
      send({ type: "done" });

      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
