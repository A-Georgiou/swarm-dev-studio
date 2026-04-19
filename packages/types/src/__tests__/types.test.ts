import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  AgentRole,
  AgentState,
  TaskLevel,
  TaskStatus,
  ChannelType,
  MessageType,
} from "../index.js";

describe("AgentRole enum", () => {
  it("should have 10 roles", () => {
    const roles = Object.values(AgentRole);
    assert.equal(roles.length, 10);
  });

  it("should include all expected roles", () => {
    assert.equal(AgentRole.CEO, "ceo");
    assert.equal(AgentRole.CTO, "cto");
    assert.equal(AgentRole.StaffManager, "staff_manager");
    assert.equal(AgentRole.SeniorManager, "senior_manager");
    assert.equal(AgentRole.Manager, "manager");
    assert.equal(AgentRole.PM, "pm");
    assert.equal(AgentRole.Developer, "developer");
    assert.equal(AgentRole.SeniorDeveloper, "senior_developer");
    assert.equal(AgentRole.QA, "qa");
    assert.equal(AgentRole.Tester, "tester");
  });
});

describe("AgentState enum", () => {
  it("should have 7 states", () => {
    const states = Object.values(AgentState);
    assert.equal(states.length, 7);
  });

  it("should include all expected states", () => {
    assert.equal(AgentState.Idle, "idle");
    assert.equal(AgentState.Thinking, "thinking");
    assert.equal(AgentState.Coding, "coding");
    assert.equal(AgentState.Discussing, "discussing");
    assert.equal(AgentState.Reviewing, "reviewing");
    assert.equal(AgentState.Walking, "walking");
    assert.equal(AgentState.Meeting, "meeting");
  });
});

describe("TaskLevel enum", () => {
  it("should have 5 levels in correct hierarchy", () => {
    const levels = Object.values(TaskLevel);
    assert.equal(levels.length, 5);
    assert.equal(TaskLevel.StrategicGoal, "strategic_goal");
    assert.equal(TaskLevel.TechnicalPlan, "technical_plan");
    assert.equal(TaskLevel.Task, "task");
    assert.equal(TaskLevel.Implementation, "implementation");
    assert.equal(TaskLevel.Verification, "verification");
  });
});

describe("TaskStatus enum", () => {
  it("should have 8 statuses", () => {
    const statuses = Object.values(TaskStatus);
    assert.equal(statuses.length, 8);
  });

  it("should include all lifecycle states", () => {
    assert.equal(TaskStatus.Draft, "draft");
    assert.equal(TaskStatus.Planning, "planning");
    assert.equal(TaskStatus.InProgress, "in_progress");
    assert.equal(TaskStatus.InReview, "in_review");
    assert.equal(TaskStatus.NeedsRevision, "needs_revision");
    assert.equal(TaskStatus.Completed, "completed");
    assert.equal(TaskStatus.Blocked, "blocked");
    assert.equal(TaskStatus.Escalated, "escalated");
  });
});

describe("ChannelType enum", () => {
  it("should have 4 channel types", () => {
    const types = Object.values(ChannelType);
    assert.equal(types.length, 4);
    assert.equal(ChannelType.Direct, "direct");
    assert.equal(ChannelType.Team, "team");
    assert.equal(ChannelType.Broadcast, "broadcast");
    assert.equal(ChannelType.Escalation, "escalation");
  });
});

describe("MessageType enum", () => {
  it("should have 5 message types", () => {
    const types = Object.values(MessageType);
    assert.equal(types.length, 5);
    assert.equal(MessageType.Chat, "chat");
    assert.equal(MessageType.TaskAssign, "task_assign");
    assert.equal(MessageType.CodeReview, "code_review");
    assert.equal(MessageType.Decision, "decision");
    assert.equal(MessageType.Artifact, "artifact");
  });
});
