// ============================================================
// Task Types — hierarchical task decomposition
// ============================================================
/** Granularity level in the task hierarchy. */
export var TaskLevel;
(function (TaskLevel) {
    TaskLevel["StrategicGoal"] = "strategic_goal";
    TaskLevel["TechnicalPlan"] = "technical_plan";
    TaskLevel["Task"] = "task";
    TaskLevel["Implementation"] = "implementation";
    TaskLevel["Verification"] = "verification";
})(TaskLevel || (TaskLevel = {}));
/** Lifecycle status for a task. */
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["Draft"] = "draft";
    TaskStatus["Planning"] = "planning";
    TaskStatus["InProgress"] = "in_progress";
    TaskStatus["InReview"] = "in_review";
    TaskStatus["NeedsRevision"] = "needs_revision";
    TaskStatus["Completed"] = "completed";
    TaskStatus["Blocked"] = "blocked";
    TaskStatus["Escalated"] = "escalated";
})(TaskStatus || (TaskStatus = {}));
//# sourceMappingURL=task.js.map