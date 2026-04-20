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
import { LLMClient } from "../llm/LLMClient.js";

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

  it("should have 6 team managers", () => {
    const managers = manager.getByRole(AgentRole.Manager);
    assert.equal(managers.length, 6);
  });

  it("should have 6 PMs", () => {
    const pms = manager.getByRole(AgentRole.PM);
    assert.equal(pms.length, 6);
  });

  it("should have agents in all 6 teams", () => {
    const teamIds = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
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
    assert.equal(chart.teams.length, 6);
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

// ── Full Delegation Chain Tests ──────────────────────────────

describe("Delegation Chain", () => {
  it("should activate both staff managers during delegation", async () => {
    const engine = new SimulationEngine({
      tickIntervalMs: 50,
      agentThinkDurationMs: 100,
      agentCodeDurationMs: 100,
      agentMeetingDurationMs: 100,
      agentReviewDurationMs: 100,
    });
    engine.initialize();

    const stateChanges: Array<{ agentId: string; type: string }> = [];
    engine.onEvent((e) => {
      if (e.type === "agent-state-changed") {
        stateChanges.push({
          agentId: e.payload.agentId as string,
          type: e.type,
        });
      }
    });

    engine.submitTask("Build auth system", "User authentication with OAuth and security review");
    engine.start();

    // Wait for scheduled activities to fire through ticks
    await new Promise((resolve) => setTimeout(resolve, 800));
    engine.stop();

    // Both staff managers should receive state changes
    const jordanChanges = stateChanges.filter((e) => e.agentId === "staff-mgr-jordan");
    const caseyChanges = stateChanges.filter((e) => e.agentId === "staff-mgr-casey");
    assert.ok(jordanChanges.length > 0, "Jordan should have state changes");
    assert.ok(caseyChanges.length > 0, "Casey should have state changes");
  });

  it("should create planning documents during delegation", async () => {
    const engine2 = new SimulationEngine({
      tickIntervalMs: 50,
      agentThinkDurationMs: 100,
    });
    engine2.initialize();

    const task = engine2.submitTask("Build a dashboard", "Analytics dashboard with charts");
    engine2.start();

    // Wait for CEO and CTO planning
    await new Promise((resolve) => setTimeout(resolve, 600));
    engine2.stop();

    const docs = engine2.taskManager.getPlanningDocs(task.id);
    assert.ok(docs.length > 0, `Should have planning docs but found ${docs.length}`);

    // CEO should have authored a doc
    const ceoDocs = docs.filter((d) => d.authorAgentId === "ceo-morgan");
    assert.ok(ceoDocs.length > 0, "CEO should create a planning document");
  });

  it("should route through senior managers", async () => {
    const messages: Array<{ senderId: string; content: string }> = [];
    const engine3 = new SimulationEngine({
      tickIntervalMs: 50,
      agentThinkDurationMs: 100,
    });
    engine3.initialize();
    engine3.messageBus.onMessage((msg) => {
      messages.push({ senderId: msg.senderId, content: msg.content });
    });

    engine3.submitTask("Build frontend app", "React frontend with components");
    engine3.start();

    // Wait for delegation chain
    await new Promise((resolve) => setTimeout(resolve, 1000));
    engine3.stop();

    // Check sr-mgr-alex or sr-mgr-sam received messages
    const srMgrMessages = messages.filter(
      (m) => m.senderId === "sr-mgr-alex" || m.senderId === "sr-mgr-sam"
    );
    assert.ok(srMgrMessages.length > 0, "Senior managers should participate in delegation");
  });

  it("should include QA in proactive planning", async () => {
    const messages: Array<{ senderId: string; content: string }> = [];
    const engine4 = new SimulationEngine({
      tickIntervalMs: 50,
      agentThinkDurationMs: 100,
      agentMeetingDurationMs: 100,
    });
    engine4.initialize();
    engine4.messageBus.onMessage((msg) => {
      messages.push({ senderId: msg.senderId, content: msg.content });
    });

    engine4.submitTask("Build API", "REST API for user management");
    engine4.start();

    // Wait for full delegation through to team level
    await new Promise((resolve) => setTimeout(resolve, 1500));
    engine4.stop();

    // QA agents should send messages (proactive involvement)
    const qaMessages = messages.filter(
      (m) =>
        m.senderId.includes("-qa-") ||
        m.senderId.includes("-tester-")
    );
    assert.ok(qaMessages.length > 0, "QA/Testers should participate proactively");
  });

  it("should have back-and-forth conversations", async () => {
    const messages: Array<{ senderId: string; content: string }> = [];
    const engine5 = new SimulationEngine({
      tickIntervalMs: 50,
      agentThinkDurationMs: 100,
    });
    engine5.initialize();
    engine5.messageBus.onMessage((msg) => {
      messages.push({ senderId: msg.senderId, content: msg.content });
    });

    engine5.submitTask("Build search feature", "Full-text search with filters");
    engine5.start();

    // Wait for conversation chain
    await new Promise((resolve) => setTimeout(resolve, 800));
    engine5.stop();

    // CTO should respond to CEO
    const ctoMessages = messages.filter((m) => m.senderId === "cto-aria");
    assert.ok(ctoMessages.length >= 2, `CTO should send multiple messages (delegation + response), got ${ctoMessages.length}`);

    // Jordan should respond to CTO
    const jordanMessages = messages.filter((m) => m.senderId === "staff-mgr-jordan");
    assert.ok(jordanMessages.length >= 1, "Jordan should respond in conversation");
  });

  it("should have 48 agents in total", () => {
    const engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
    assert.equal(engine.agentManager.count, 48);
  });

  it("should have all roles represented", () => {
    const engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
    const roles = [
      AgentRole.CEO, AgentRole.CTO,
      AgentRole.StaffManager, AgentRole.SeniorManager,
      AgentRole.Manager, AgentRole.PM,
      AgentRole.SeniorDeveloper, AgentRole.Developer,
      AgentRole.QA, AgentRole.Tester,
    ];
    for (const role of roles) {
      const agents = engine.agentManager.getByRole(role);
      assert.ok(agents.length > 0, `Should have agents with role ${role}`);
    }
  });

  it("should assign distinct AI models across hierarchy", () => {
    const engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
    const ceo = engine.agentManager.get("ceo-morgan")!;
    const cto = engine.agentManager.get("cto-aria")!;
    const jordan = engine.agentManager.get("staff-mgr-jordan")!;

    assert.equal(ceo.persona.modelAssignment, "claude-opus-4.7");
    assert.equal(cto.persona.modelAssignment, "claude-opus-4.6-1m");
    assert.equal(jordan.persona.modelAssignment, "claude-opus-4.5");
    assert.notEqual(ceo.persona.modelAssignment, cto.persona.modelAssignment);
  });

  it("should populate character animations in game state", () => {
    const engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
    const state = engine.getGameState();
    const char = state.characters[0];
    assert.ok(char.animations, "Character should have animations");

    const animKeys = Object.keys(char.animations);
    assert.ok(animKeys.length >= 7, "Should have animations for all 7 agent states");

    // Check a specific animation has proper structure
    const idleAnim = char.animations[AgentState.Idle];
    assert.ok(idleAnim.name, "Animation should have a name");
    assert.ok(Array.isArray(idleAnim.frames), "Animation should have frames array");
    assert.ok(idleAnim.frameRate > 0, "Animation should have positive frameRate");
    assert.equal(typeof idleAnim.loop, "boolean", "Animation loop should be boolean");
  });

  it("should populate tilemap rooms and layers in game state", () => {
    const engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
    const state = engine.getGameState();

    // Tilemap layers
    assert.ok(state.tilemap.layers.length > 0, "Should have tilemap layers");
    assert.ok(state.tilemap.layers.length >= 4, "Should have at least 4 layers (floor, walls, furniture, above)");
    const layerNames = state.tilemap.layers.map((l) => l.name);
    assert.ok(layerNames.includes("floor"), "Should have floor layer");
    assert.ok(layerNames.includes("walls"), "Should have walls layer");

    // Each layer should have proper data
    for (const layer of state.tilemap.layers) {
      assert.ok(Array.isArray(layer.data), "Layer data should be an array");
      assert.equal(layer.data.length, 80 * 60, "Layer data should match tile count");
      assert.equal(typeof layer.visible, "boolean", "Layer visible should be boolean");
    }

    // Rooms
    assert.ok(state.tilemap.rooms.length > 0, "Should have office rooms");
    assert.ok(state.tilemap.rooms.length >= 8, "Should have at least 8 rooms (6 teams + executive + management)");
    const roomIds = state.tilemap.rooms.map((r) => r.id);
    assert.ok(roomIds.includes("alpha"), "Should have Team Alpha room");
    assert.ok(roomIds.includes("executive"), "Should have Executive room");
    assert.ok(roomIds.includes("large_mtg"), "Should have meeting room");

    // Room structure
    for (const room of state.tilemap.rooms) {
      assert.ok(room.id, "Room should have id");
      assert.ok(room.name, "Room should have name");
      assert.ok(room.bounds, "Room should have bounds");
      assert.ok(["office", "meeting_room", "open_space", "break_room", "server_room"].includes(room.type), "Room type should be valid");
    }
  });
});

// ── LLM Client ──────────────────────────────────────────────

describe("LLM Client", () => {
  it("should generate local responses without API keys", () => {
    // LLMClient imported at top of file
    const client = new LLMClient();

    const response = client.generateLocal({
      model: "claude-opus-4.7",
      messages: [
        { role: "system", content: "You are Morgan, CEO. openness: 0.9, conscientiousness: 0.85" },
        { role: "user", content: "Build a new authentication system" },
      ],
    });

    assert.ok(response.content.length > 0, "Should generate non-empty content");
    assert.equal(response.model, "claude-opus-4.7");
    assert.equal(response.cached, false);
  });

  it("should resolve correct provider from model name", () => {
    // LLMClient imported at top of file
    const client = new LLMClient();

    // Without API keys, isAvailable returns false
    assert.equal(client.isAvailable("claude-opus-4.7"), false);
    assert.equal(client.isAvailable("gpt-5.4"), false);
  });

  it("should cache identical requests", async () => {
    // LLMClient imported at top of file
    const client = new LLMClient();

    const request = {
      model: "claude-sonnet-4.6",
      messages: [
        { role: "system" as const, content: "You are a developer" },
        { role: "user" as const, content: "Fix the bug in auth module" },
      ],
    };

    const first = await client.chat(request);
    const second = await client.chat(request);

    assert.equal(first.cached, false, "First call should not be cached");
    assert.equal(second.cached, true, "Second call should be cached");
    assert.equal(first.content, second.content, "Content should match");
  });

  it("should generate role-appropriate responses", () => {
    // LLMClient imported at top of file
    const client = new LLMClient();

    const ceoResponse = client.generateLocal({
      model: "claude-opus-4.7",
      messages: [
        { role: "system", content: "You are the CEO. Chief Executive Officer" },
        { role: "user", content: "Build user auth" },
      ],
    });
    assert.ok(ceoResponse.content.includes("strategic"), "CEO should mention strategy");

    const qaResponse = client.generateLocal({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: "You are QA. Quality assurance engineer" },
        { role: "user", content: "Test user auth" },
      ],
    });
    assert.ok(qaResponse.content.includes("test"), "QA should mention testing");
  });

  it("should be accessible from SimulationEngine", () => {
    const engine = new SimulationEngine({ tickIntervalMs: 100 });
    engine.initialize();
    const llm = engine.getLLMClient();
    assert.ok(llm, "Engine should expose LLM client");
    assert.equal(typeof llm.chat, "function", "LLM client should have chat method");
    assert.equal(typeof llm.isAvailable, "function", "LLM client should have isAvailable method");
  });
});
