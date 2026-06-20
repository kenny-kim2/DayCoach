import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createAzureClient, AZURE_DEPLOYMENT } from "../agent/client";
import { buildSystemPrompt } from "../agent/prompts";
import { isTaskArray, isPrioritizedTaskArray, isDayPlan } from "../agent/tools";
import { AnalyzeRequest, SSEEvent, Task, PrioritizedTask, DayPlan } from "../../../shared/src/types";
import OpenAI from "openai";

const router = Router();

function sendSSE(res: Response, event: SSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "parse_tasks",
      description: "Extract individual tasks from free-form text input",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description: "List of extracted tasks",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Unique task ID (uuid)" },
                title: { type: "string", description: "Short task title" },
                rawText: { type: "string", description: "Original raw text for this task" },
              },
              required: ["id", "title", "rawText"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prioritize_tasks",
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
    },
  },
  {
    type: "function",
    function: {
      name: "build_day_plan",
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
    },
  },
];

router.post("/analyze", async (req: Request, res: Response) => {
  const body = req.body as AnalyzeRequest;

  if (!body.input || body.input.trim() === "") {
    res.status(400).json({ error: "input_required", message: "입력 내용을 입력해주세요." });
    return;
  }

  const availableHours = body.availableHours ?? 8;

  // SSE 헤더 설정
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const client = createAzureClient();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(body.input) },
      {
        role: "user",
        content: `사용 가능한 시간: ${availableHours}시간. 위 입력을 분석해서 parse_tasks → prioritize_tasks → build_day_plan 순서로 도구를 호출하세요.`,
      },
    ];

    let parsedTasks: Task[] = [];
    let prioritizedTasks: PrioritizedTask[] = [];

    // 에이전트 루프: 도구 3개가 모두 호출될 때까지 반복
    while (true) {
      const response = await client.chat.completions.create({
        model: AZURE_DEPLOYMENT,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      if (!choice) break;

      const msg = choice.message;
      messages.push(msg);

      // 도구 호출 없으면 종료
      if (!msg.tool_calls || msg.tool_calls.length === 0) break;

      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

      for (const call of msg.tool_calls) {
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>;

        if (call.function.name === "parse_tasks") {
          const tasks = (args.tasks as Task[] | undefined) ?? [];
          // 각 task에 id 보장
          parsedTasks = tasks.map((t) => ({
            id: t.id || uuidv4(),
            title: t.title,
            rawText: t.rawText,
          }));
          sendSSE(res, { type: "tasks_parsed", tasks: parsedTasks });
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ tasks: parsedTasks }),
          });
        } else if (call.function.name === "prioritize_tasks") {
          const tasks = (args.tasks as PrioritizedTask[] | undefined) ?? [];
          prioritizedTasks = tasks.map((t) => ({
            ...t,
            id: t.id || uuidv4(),
          }));
          sendSSE(res, { type: "tasks_prioritized", tasks: prioritizedTasks });
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ tasks: prioritizedTasks }),
          });
        } else if (call.function.name === "build_day_plan") {
          const plan: DayPlan = {
            firstAction: (args.firstAction as DayPlan["firstAction"]),
            todayTasks: (args.todayTasks as PrioritizedTask[] | undefined) ?? [],
            deferredTasks: (args.deferredTasks as PrioritizedTask[] | undefined) ?? [],
            timeBlocks: (args.timeBlocks as DayPlan["timeBlocks"] | undefined) ?? [],
            totalEstimatedMinutes: (args.totalEstimatedMinutes as number) ?? 0,
            motivationalMessage: (args.motivationalMessage as string) ?? "",
          };
          sendSSE(res, { type: "day_plan", plan });
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(plan),
          });
        }
      }

      messages.push(...toolResults);

      // 모든 도구가 호출됐으면 종료
      if (choice.finish_reason === "stop") break;
    }

    sendSSE(res, { type: "done" });
    res.end();
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    console.error("[analyze]", error);

    if (error.status === 429) {
      if (!res.headersSent) {
        res.status(429).json({ error: "rate_limited", message: "잠시 후 다시 시도해주세요." });
      } else {
        sendSSE(res, { type: "error", message: "잠시 후 다시 시도해주세요." });
        res.end();
      }
      return;
    }

    if (!res.headersSent) {
      res.status(500).json({ error: "analysis_failed", message: "분석 중 오류가 발생했습니다. 다시 시도해주세요." });
    } else {
      sendSSE(res, { type: "error", message: "분석 중 오류가 발생했습니다. 다시 시도해주세요." });
      res.end();
    }
  }
});

export default router;
