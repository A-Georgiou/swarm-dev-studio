// ============================================================
// TaskManager — hierarchical task decomposition and tracking
// ============================================================

import {
  TaskLevel,
  TaskStatus,
  type Task,
  type TaskContext,
  type SubTask,
  type PlanningDocument,
} from "@swarm/types";

let nextTaskId = 1;
function generateTaskId(): string {
  return `task-${nextTaskId++}`;
}

let nextDocId = 1;
function generateDocId(): string {
  return `doc-${nextDocId++}`;
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private planningDocs: Map<string, PlanningDocument> = new Map();

  /** Create a new top-level strategic task from a user request. */
  createStrategicTask(title: string, description: string): Task {
    const task: Task = {
      id: generateTaskId(),
      parentId: null,
      title,
      description,
      level: TaskLevel.StrategicGoal,
      status: TaskStatus.Draft,
      assignedTo: "ceo-morgan",
      children: [],
      artifacts: [],
      context: {
        strategicGoal: description,
        technicalApproach: "",
        taskSpecification: "",
        implementationPlan: "",
        constraints: [],
        acceptanceCriteria: [],
        relatedTasks: [],
      },
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /** Decompose a parent task into child sub-tasks. */
  decompose(parentId: string, subtasks: SubTask[], assigneeMap: Record<string, string>): Task[] {
    const parent = this.tasks.get(parentId);
    if (!parent) throw new Error(`Task ${parentId} not found`);

    const childLevel = this.getChildLevel(parent.level);
    const children: Task[] = [];

    for (const sub of subtasks) {
      const childId = generateTaskId();
      const child: Task = {
        id: childId,
        parentId,
        title: sub.title,
        description: sub.description,
        level: childLevel,
        status: TaskStatus.Planning,
        assignedTo: assigneeMap[sub.title] ?? sub.suggestedAssignee ?? parent.assignedTo,
        children: [],
        artifacts: [],
        context: {
          ...parent.context,
          taskSpecification: sub.description,
          relatedTasks: [...parent.context.relatedTasks, parentId],
        },
      };
      this.tasks.set(childId, child);
      children.push(child);
      parent.children.push(childId);
    }

    parent.status = TaskStatus.InProgress;
    return children;
  }

  /** Create a planning document for a task. */
  createPlanningDoc(
    taskId: string,
    authorAgentId: string,
    content: PlanningDocument["content"]
  ): PlanningDocument {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const doc: PlanningDocument = {
      id: generateDocId(),
      taskId,
      authorAgentId,
      level: task.level,
      content,
      approvedBy: null,
      revision: 1,
    };

    this.planningDocs.set(doc.id, doc);
    return doc;
  }

  /** Update a task's status. */
  updateStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    task.status = status;

    // If completed, check if parent's children are all done
    if (status === TaskStatus.Completed && task.parentId) {
      this.checkParentCompletion(task.parentId);
    }
  }

  /** Assign a task to an agent. */
  assign(taskId: string, agentId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    task.assignedTo = agentId;
  }

  /** Escalate a task up the chain. */
  escalate(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    task.status = TaskStatus.Escalated;
  }

  /** Get a task by ID. */
  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /** Get all tasks. */
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  /** Get tasks assigned to a specific agent. */
  getByAssignee(agentId: string): Task[] {
    return this.getAll().filter((t) => t.assignedTo === agentId);
  }

  /** Get tasks at a specific status. */
  getByStatus(status: TaskStatus): Task[] {
    return this.getAll().filter((t) => t.status === status);
  }

  /** Get planning documents for a task. */
  getPlanningDocs(taskId: string): PlanningDocument[] {
    return Array.from(this.planningDocs.values()).filter(
      (d) => d.taskId === taskId
    );
  }

  /** Get the total task count. */
  get count(): number {
    return this.tasks.size;
  }

  // ── Private helpers ───────────────────────────────────────

  private getChildLevel(parentLevel: TaskLevel): TaskLevel {
    switch (parentLevel) {
      case TaskLevel.StrategicGoal:
        return TaskLevel.TechnicalPlan;
      case TaskLevel.TechnicalPlan:
        return TaskLevel.Task;
      case TaskLevel.Task:
        return TaskLevel.Implementation;
      case TaskLevel.Implementation:
        return TaskLevel.Verification;
      default:
        return TaskLevel.Verification;
    }
  }

  private checkParentCompletion(parentId: string): void {
    const parent = this.tasks.get(parentId);
    if (!parent) return;

    const allChildrenDone = parent.children.every((childId) => {
      const child = this.tasks.get(childId);
      return child?.status === TaskStatus.Completed;
    });

    if (allChildrenDone && parent.children.length > 0) {
      parent.status = TaskStatus.InReview;
    }
  }
}
