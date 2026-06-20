import { Router, Request, Response } from "express";
import { defineTool, approveAll } from "@github/copilot-sdk";
import { v4 as uuidv4 } from "uuid";
import { getCopilotClient } from "../agent/client";
import { buildSystemPrompt, preParseInput } from "../agent/prompts";
import { AnalyzeRequest, SSEEvent, Task, PrioritizedTask, DayPlan } from "../../../shared/src/types";

const router = Router();

function sendSSE(res: Response, event: SSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

router.post("/analyze", async (req: Request, res: Response) => {
  const body = req.body as AnalyzeRequest;

  if (!body.input || body.input.trim() === "") {
    res.status(400).json({ error: "input_required", message: "입력 내용을 입력해주세요." });
    return;
  }

  const availableHours = body.availableHours ?? 8;
  const currentHour = (body as { currentHour?: number }).currentHour ?? new Date().getHours();
  const currentMinute = (body as { currentMinute?: number }).currentMinute ?? new Date().getMinutes();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  type Session = Awaited<ReturnType<Awaited<ReturnType<typeof getCopilotClient>>["createSession"]>>;
  let session: Session | null = null;

  try {
    const client = await getCopilotClient();

    // 자유형식 텍스트를 개별 할 일 항목으로 사전 분리
    const preParsedItems = preParseInput(body.input);

    // 단계별 결과 공유 (핸들러 간 교차 참조용)
    let sharedPrioritizedTasks: PrioritizedTask[] = [];

    session = await client.createSession({
      ...(process.env.COPILOT_MODEL ? { model: process.env.COPILOT_MODEL } : {}),
      systemMessage: {
        mode: "replace",
        content: buildSystemPrompt(body.input, preParsedItems, currentHour, currentMinute, availableHours),
      },
      infiniteSessions: { enabled: false },
      onPermissionRequest: approveAll,
      tools: [
        defineTool("parse_tasks", {
          description: "Decompose the user's input into specific, actionable subtasks. Break down complex or vague tasks into concrete steps (each completable in 15–90 min). Simple single-step tasks can remain as-is.",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                description: "List of decomposed actionable subtasks",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Unique task ID (uuid)" },
                    title: { type: "string", description: "Concrete, action-verb-led subtask title (e.g. '보고서 목차 잡기')" },
                    rawText: { type: "string", description: "The original input text this subtask was derived from" },
                  },
                  required: ["id", "title", "rawText"],
                },
              },
            },
            required: ["tasks"],
          },
          handler: async (args) => {
            const { tasks } = args as { tasks: Task[] };
            const parsedTasks: Task[] = tasks.map((t) => ({
              id: t.id || uuidv4(),
              title: t.title,
              rawText: t.rawText,
            }));
            sendSSE(res, { type: "tasks_parsed", tasks: parsedTasks });
            return { success: true, count: parsedTasks.length };
          },
        }),
        defineTool("prioritize_tasks", {
          description: "Assign priority, estimated duration, category, and urgency to each task",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                description: "List of prioritized tasks",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    rawText: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    estimatedMinutes: { type: "number" },
                    category: { type: "string", enum: ["work", "personal", "health", "admin", "other"] },
                    urgency: { type: "string", enum: ["today", "this-week", "someday"] },
                    reason: { type: "string", description: "One-sentence reason for the priority" },
                  },
                  required: ["id", "title", "rawText", "priority", "estimatedMinutes", "category", "urgency", "reason"],
                },
              },
            },
            required: ["tasks"],
          },
          handler: async (args) => {
            const { tasks } = args as { tasks: PrioritizedTask[] };
            const VALID_PRIORITY = ["high", "medium", "low"] as const;
            const VALID_CATEGORY = ["work", "personal", "health", "admin", "other"] as const;
            const VALID_URGENCY = ["today", "this-week", "someday"] as const;
            const toNum = (v: unknown, fallback: number) => {
              const n = Number(v);
              return isNaN(n) || n <= 0 ? fallback : n;
            };
            sharedPrioritizedTasks = tasks.map((t) => ({
              ...t,
              id: t.id || uuidv4(),
              priority: VALID_PRIORITY.includes(t.priority as typeof VALID_PRIORITY[number]) ? t.priority : "medium",
              category: VALID_CATEGORY.includes(t.category as typeof VALID_CATEGORY[number]) ? t.category : "other",
              urgency: VALID_URGENCY.includes(t.urgency as typeof VALID_URGENCY[number]) ? t.urgency : "today",
              estimatedMinutes: toNum(t.estimatedMinutes, 30),
            }));
            sendSSE(res, { type: "tasks_prioritized", tasks: sharedPrioritizedTasks });
            return { success: true, count: sharedPrioritizedTasks.length };
          },
        }),
        defineTool("build_day_plan", {
          description: "Build an actionable day plan with time blocks and identify the first action to take right now",
          parameters: {
            type: "object",
            properties: {
              firstAction: {
                type: "object",
                properties: {
                  taskId: { type: "string" },
                  taskTitle: { type: "string" },
                  why: { type: "string" },
                  howToStart: { type: "string" },
                },
                required: ["taskId", "taskTitle", "why", "howToStart"],
              },
              todayTasks: {
                type: "array",
                items: { type: "object" },
                description: "Tasks to complete today (urgency=today)",
              },
              deferredTasks: {
                type: "array",
                items: { type: "object" },
                description: "Tasks deferred to later",
              },
              timeBlocks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    startOffset: { type: "number" },
                    durationMinutes: { type: "number" },
                    taskId: { type: "string" },
                    taskTitle: { type: "string" },
                  },
                  required: ["startOffset", "durationMinutes", "taskId", "taskTitle"],
                },
              },
              totalEstimatedMinutes: { type: "number" },
              motivationalMessage: { type: "string" },
            },
            required: ["firstAction", "todayTasks", "deferredTasks", "timeBlocks", "totalEstimatedMinutes", "motivationalMessage"],
          },
          handler: async (args) => {
            const a = args as {
              firstAction: DayPlan["firstAction"];
              todayTasks: { id: string; title?: string }[];
              deferredTasks: { id: string; title?: string }[];
              timeBlocks: DayPlan["timeBlocks"];
              totalEstimatedMinutes: number;
              motivationalMessage: string;
            };
            const toNum = (v: unknown, fallback: number) => {
              const n = Number(v);
              return isNaN(n) ? fallback : n;
            };
            // task ID로 sharedPrioritizedTasks에서 전체 데이터 교차 참조
            const byId = new Map(sharedPrioritizedTasks.map((t: PrioritizedTask) => [t.id, t]));
            const resolveTask = (t: { id: string; title?: string }): PrioritizedTask =>
              byId.get(t.id) ?? {
                id: t.id,
                title: t.title ?? t.id,
                rawText: t.title ?? "",
                priority: "medium",
                estimatedMinutes: 30,
                category: "other",
                urgency: "today",
                reason: "",
              };
            const plan: DayPlan = {
              firstAction: a.firstAction,
              todayTasks: (a.todayTasks ?? []).map(resolveTask),
              deferredTasks: (a.deferredTasks ?? []).map(resolveTask),
              timeBlocks: (a.timeBlocks ?? []).map((b) => ({
                ...b,
                startOffset: toNum(b.startOffset, 0),
                durationMinutes: toNum(b.durationMinutes, 30),
              })),
              totalEstimatedMinutes: toNum(a.totalEstimatedMinutes, 0),
              motivationalMessage: a.motivationalMessage ?? "",
            };
            sendSSE(res, { type: "day_plan", plan });
            return { success: true };
          },
        }),
      ],
    });

    await session.sendAndWait({
      prompt: `사용 가능한 시간: ${availableHours}시간.\n\n분석할 항목 (${preParsedItems.length}개):\n${preParsedItems.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nparse_tasks → prioritize_tasks → build_day_plan 순서로 도구를 호출하세요.`,
    }, 300000); // 5분 타임아웃

    sendSSE(res, { type: "done" });
    res.end();
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    console.error("[analyze]", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "analysis_failed", message: "분석 중 오류가 발생했습니다. 다시 시도해주세요." });
    } else {
      sendSSE(res, { type: "error", message: "분석 중 오류가 발생했습니다. 다시 시도해주세요." });
      res.end();
    }
  } finally {
    if (session) {
      await session.disconnect().catch(() => {});
    }
  }
});

export default router;
