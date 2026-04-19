// ============================================================
// Engine integration tests — Node.js built-in test runner
// ============================================================

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { AgentManager } from "../agents/AgentManager.js";
import { Agent } from "../agents/Agent.js";
import { OrgManager } from "../org/OrgManager.js";
import { TaskManager } from "../tasks/TaskManager.js";
import { MessageBus } from "../messages/MessageBus.js";
import { SimulationEngine } from "../simulation/SimulationEngine.js";
import { PERSONAS, AGENT_ROLES, AGENT_TEAMS } from "../agents/personas.js";
import {
  AgentRole,
  AgentState,
  TaskLevel,
  TaskStatus,
  ChannelType,
  MessageType,
} from "@swarm/types";

// ── Agent Tests ─────────────────────────────────────────────

describe("AgentManager", () => {
  let manager: AgentManager;

  before(() => {
    manager = new AgentManager();
    manager.initialize();
  });

  it("should initialize all agents from personas", () => {
    const count = Object.keys(PERSONAS).length;
    assert.equal(manager.count, count);
  });

  it("should have exactly 1 CEO", () => {
    const ceos = manager.getByRole(AgentRole.CEO);
    assert.equal(ceos.length, 1);
    assert.equal(ceos[0].persona.name, "Morgan Blackwell");
  });

  it("should have exactly 1 CTO", () => {
    const ctos = manager.getByRole(AgentRole.CTO);
    assert.equal(ctos.length, 1);
  });

  it("should have 5 team managers", () => {
    const managers = manager.getByRole(AgentRole.Manager);
    assert.equal(managers.length, 5);
  });

  it("should have 5 PMs", () => {
    const pms = manager.getByRole(AgentRole.PM);
    assert.equal(pms.length, 5);
  });

  it("should have agents in all 5 teams", () => {
    const teamIds = ["alpha", "beta", "gamma", "delta", "epsilon"];
    for (const teamId of teamIds) {
      const members = manager.getByTeam(teamId);
      assert.ok(members.length >= 7, `Team ${teamId} has ${members.length} members`);
    }
  });

  it("should assign desk positions to agents", () => {
    const ceo = manager.get("ceo-morgan");
    assert.ok(ceo);
    assert.ok(ceo.desk, "CEO should have a desk assignment");
  });

  it("should track agent state", () => {
    const agent = manager.get("alpha-dev-zara")!;
    assert.equal(agent.state, AgentState.Idle);
    agent.setState(AgentState.Coding);
    assert.equal(agent.state, AgentState.Coding);
  });
});

// ── Org Tests ───────────────────────────────────────────────

describe("OrgManager", () => {
  let agentManager: AgentManager;
  let orgManager: OrgManager;

  before(() => {
    agentManager = new AgentManager();
    agentManager.initialize();
    orgManager = new OrgManager();
    orgManager.initialize(agentManager);
  });

  it("should build org chart", () => {
    const chart = orgManager.getOrgChart();
    assert.equal(chart.ceo, "ceo-morgan");
    assert.equal(chart.cto, "cto-aria");
    assert.equal(chart.teams.length, 5);
  });

  it("should track reporting chains", () => {
    const ctoManager = orgManager.getManager("cto-aria");
    assert.equal(ctoManager, "ceo-morgan");

    const devManager = orgManager.getManager("alpha-dev-zara");
    assert.equal(devManager, "alpha-mgr-priya");
  });

  it("should find direct reports", () => {
    const ceoReports = orgManager.getDirectReports("ceo-morgan");
    assert.ok(ceoReports.includes("cto-aria"));
  });

  it("should trace chain of command to CEO", () => {
    const chain = orgManager.getChainOfCommand("alpha-dev-zara");
    assert.ok(chain.length >= 3);
    assert.equal(chain[chain.length - 1], "ceo-morgan");
  });

  it("should suggest team based on keywords", () => {
    assert.equal(orgManager.suggestTeam(["frontend", "react", "ui"]), "alpha");
    assert.equal(orgManager.suggestTeam(["backend", "api", "server"]), "beta");
    assert.equal(orgManager.suggestTeam(["test", "qa", "quality"]), "delta");
  });
});

// ── Task Tests ──────────────────────────────────────────────

describe("TaskManager", () => {
  let taskManager: TaskManager;

  before(() => {
    taskManager = new TaskManager();
  });

  it("should create a strategic task", () => {
    const task = taskManager.createStrategicTask("Build a chat app", "Real-time messaging platform");
    assert.ok(task.id);
    assert.equal(task.level, TaskLevel.StrategicGoal);
    assert.equal(task.status, TaskStatus.Draft);
    assert.equal(task.assignedTo, "ceo-morgan");
  });

  it("should decompose a task into subtasks", () => {
    const parent = taskManager.createStrategicTask("Build APIs", "REST APIs for users");
    const subtasks = [
      { title: "User API", description: "CRUD for users", estimatedComplexity: "medium" as const, requiredSkills: ["backend"] },
      { title: "Auth API", description: "Login/logout", estimatedComplexity: "medium" as const, requiredSkills: ["backend"] },
    ];
    const children = taskManager.decompose(parent.id, subtasks, {});
    assert.equal(children.length, 2);
    assert.equal(children[0].level, TaskLevel.TechnicalPlan);
    assert.equal(parent.children.length, 2);
  });

  it("should update task status", () => {
    const task = taskManager.createStrategicTask("Test", "Test task");
    taskManager.updateStatus(task.id, TaskStatus.InProgress);
    assert.equal(taskManager.get(task.id)!.status, TaskStatus.InProgress);
  });

  it("should find tasks by assignee", () => {
    const task = taskManager.createStrategicTask("Assigned test", "Test");
    taskManager.assign(task.id, "alpha-dev-zara");
    const found = taskManager.getByAssignee("alpha-dev-zara");
    assert.ok(found.some((t) => t.id === task.id));
  });
});

// ── Message Tests ───────────────────────────────────────────

describe("MessageBus", () => {
  let messageBus: MessageBus;

  before(() => {
    messageBus = new MessageBus();
  });

  it("should create channels", () => {
    const channel = messageBus.createChannel(ChannelType.Team, "test-team", ["a", "b"]);
    assert.ok(channel.id);
    assert.equal(channel.name, "test-team");
    assert.equal(channel.memberIds.length, 2);
  });

  it("should send and retrieve messages", () => {
    const channel = messageBus.createChannel(ChannelType.Team, "msg-test", ["x", "y"]);
    const msg = messageBus.send(channel.id, "x", MessageType.Chat, "Hello!");
    assert.ok(msg.id);
    const messages = messageBus.getMessages(channel.id);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].content, "Hello!");
  });

  it("should send direct messages", () => {
    const msg = messageBus.sendDirect("agent-a", "agent-b", "DM test");
    assert.ok(msg.id);
    assert.equal(msg.content, "DM test");
  });

  it("should notify message handlers", () => {
    let received = false;
    messageBus.onMessage(() => { received = true; });
    const ch = messageBus.createChannel(ChannelType.Broadcast, "notify-test", ["z"]);
    messageBus.send(ch.id, "z", MessageType.Chat, "notify");
    assert.ok(received);
  });
});

// ── Simulation Engine Tests ─────────────────────────────────

describe("SimulationEngine", () => {
  let engine: SimulationEngine;

  before(() => {
    engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
  });

  it("should initialize all subsystems", () => {
    assert.ok(engine.agentManager.count > 0);
    assert.ok(engine.messageBus.getAllChannels().length > 0);
  });

  it("should produce a valid game state", () => {
    const state = engine.getGameState();
    assert.ok(state.characters.length > 0);
    assert.equal(state.tick, 0);
  });

  it("should submit a task and trigger delegation", () => {
    const events: string[] = [];
    engine.onEvent((e) => events.push(e.type));

    const task = engine.submitTask("Build a blog", "A simple blogging platform");
    assert.ok(task.id);
    assert.equal(task.status, TaskStatus.Draft);

    // Should have emitted events
    assert.ok(events.includes("task-updated"));
    assert.ok(events.includes("agent-speech"));
  });

  it("should track tick count", () => {
    assert.equal(engine.getTick(), 0);
  });

  it("should be stoppable", () => {
    engine.start();
    assert.ok(engine.isRunning);
    engine.stop();
    assert.ok(!engine.isRunning);
  });
});
