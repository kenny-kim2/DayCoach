export interface Task {
  id: string;
  title: string;
  rawText: string;
}

export interface PrioritizedTask extends Task {
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  category: "work" | "personal" | "health" | "admin" | "other";
  urgency: "today" | "this-week" | "someday";
  reason: string;
}

export interface TimeBlock {
  startOffset: number;
  durationMinutes: number;
  taskId: string;
  taskTitle: string;
}

export interface DayPlan {
  firstAction: {
    taskId: string;
    taskTitle: string;
    why: string;
    howToStart: string;
  };
  todayTasks: PrioritizedTask[];
  deferredTasks: PrioritizedTask[];
  timeBlocks: TimeBlock[];
  totalEstimatedMinutes: number;
  motivationalMessage: string;
}

export interface AnalyzeRequest {
  input: string;
  availableHours?: number;
}

export type SSEEventType =
  | { type: "tasks_parsed"; tasks: Task[] }
  | { type: "tasks_prioritized"; tasks: PrioritizedTask[] }
  | { type: "day_plan"; plan: DayPlan }
  | { type: "done" }
  | { type: "error"; message: string };

export type AnalysisStep = "idle" | "parsing" | "prioritizing" | "planning" | "done" | "error";
