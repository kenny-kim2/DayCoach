import { Task, PrioritizedTask, DayPlan } from "../../../shared/src/types";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => unknown;
}

export const parseTasksTool: ToolDefinition = {
  name: "parse_tasks",
  description: "Extract individual tasks from free-form text input",
  parameters: {
    type: "object",
    properties: {
      raw_input: {
        type: "string",
        description: "The raw user input text",
      },
    },
    required: ["raw_input"],
  },
  handler(args) {
    // This is a passthrough — the AI fills in the result via tool_result
    return args;
  },
};

export const prioritizeTasksTool: ToolDefinition = {
  name: "prioritize_tasks",
  description:
    "Assign priority, estimated duration, category, and urgency to each task",
  parameters: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            rawText: { type: "string" },
          },
          required: ["id", "title", "rawText"],
        },
        description: "List of tasks to prioritize",
      },
    },
    required: ["tasks"],
  },
  handler(args) {
    return args;
  },
};

export const buildDayPlanTool: ToolDefinition = {
  name: "build_day_plan",
  description:
    "Build an actionable day plan with time blocks and identify the first action to take right now",
  parameters: {
    type: "object",
    properties: {
      prioritized_tasks: {
        type: "array",
        description: "List of prioritized tasks",
        items: { type: "object" },
      },
      available_hours: {
        type: "number",
        description: "Available hours today (default: 8)",
      },
    },
    required: ["prioritized_tasks"],
  },
  handler(args) {
    return args;
  },
};

export const allTools: ToolDefinition[] = [
  parseTasksTool,
  prioritizeTasksTool,
  buildDayPlanTool,
];

// Type guards
export function isTaskArray(val: unknown): val is Task[] {
  return Array.isArray(val);
}

export function isPrioritizedTaskArray(val: unknown): val is PrioritizedTask[] {
  return Array.isArray(val);
}

export function isDayPlan(val: unknown): val is DayPlan {
  return typeof val === "object" && val !== null && "firstAction" in val;
}
