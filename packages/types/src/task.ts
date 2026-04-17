// ============================================================
// Task Types — hierarchical task decomposition
// ============================================================

/** Granularity level in the task hierarchy. */
export enum TaskLevel {
  StrategicGoal = "strategic_goal",
  TechnicalPlan = "technical_plan",
  Task = "task",
  Implementation = "implementation",
  Verification = "verification",
}

/** Lifecycle status for a task. */
export enum TaskStatus {
  Draft = "draft",
  Planning = "planning",
  InProgress = "in_progress",
  InReview = "in_review",
  NeedsRevision = "needs_revision",
  Completed = "completed",
  Blocked = "blocked",
  Escalated = "escalated",
}

/** Accumulated context that flows down the task chain. */
export interface TaskContext {
  strategicGoal: string;
  technicalApproach: string;
  taskSpecification: string;
  implementationPlan: string;
  constraints: string[];
  acceptanceCriteria: string[];
  relatedTasks: string[];
}

/** An artefact produced by a task (code, document, etc.). */
export interface Artifact {
  id: string;
  taskId: string;
  type: string;
  content: string;
  createdAt: number;
}

/** Core task unit in the hierarchical decomposition tree. */
export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  level: TaskLevel;
  status: TaskStatus;
  assignedTo: string;
  children: string[];
  artifacts: Artifact[];
  context: TaskContext;
}

/** A sub-task proposal produced during decomposition. */
export interface SubTask {
  title: string;
  description: string;
  estimatedComplexity: "trivial" | "small" | "medium" | "large" | "epic";
  requiredSkills: string[];
  suggestedAssignee?: string;
}

/** A planning write-up produced by an agent before task delegation. */
export interface PlanningDocument {
  id: string;
  taskId: string;
  authorAgentId: string;
  level: TaskLevel;
  content: {
    summary: string;
    analysis: string;
    approach: string;
    decomposition: SubTask[];
    risks: string[];
    dependencies: string[];
  };
  approvedBy: string | null;
  revision: number;
}
