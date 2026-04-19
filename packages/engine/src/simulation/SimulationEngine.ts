// ============================================================
// SimulationEngine — tick-based loop driving agent behaviours
// ============================================================

import {
  AgentState,
  AgentRole,
  TaskStatus,
  MessageType,
  type GameState,
  type CharacterSprite,
  type SpeechBubble,
  type Task,
} from "@swarm/types";
import { AgentManager } from "../agents/AgentManager.js";
import { Agent } from "../agents/Agent.js";
import { OrgManager } from "../org/OrgManager.js";
import { TaskManager } from "../tasks/TaskManager.js";
import { MessageBus } from "../messages/MessageBus.js";

/** Callback for when the simulation produces an event. */
export type SimulationEventHandler = (event: SimulationEvent) => void;

export interface SimulationEvent {
  type:
    | "agent-moved"
    | "agent-state-changed"
    | "agent-speech"
    | "task-updated"
    | "agent-spawned";
  payload: Record<string, unknown>;
}

/** Configuration for the simulation speed. */
export interface SimulationConfig {
  tickIntervalMs: number;
  agentThinkDurationMs: number;
  agentCodeDurationMs: number;
  agentMeetingDurationMs: number;
  agentReviewDurationMs: number;
  movementChance: number;
  interactionChance: number;
  speechDurationMs: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  tickIntervalMs: 1000,
  agentThinkDurationMs: 5000,
  agentCodeDurationMs: 10000,
  agentMeetingDurationMs: 8000,
  agentReviewDurationMs: 6000,
  movementChance: 0.05,
  interactionChance: 0.08,
  speechDurationMs: 3000,
};

/** Phrases agents say based on their state/role. */
const STATE_PHRASES: Record<AgentState, string[]> = {
  [AgentState.Idle]: [
    "Checking emails...",
    "Looking at the board.",
    "Coffee break?",
    "Organizing my desk.",
  ],
  [AgentState.Thinking]: [
    "Hmm, interesting...",
    "Let me think about this.",
    "What's the best approach?",
    "Considering options...",
  ],
  [AgentState.Coding]: [
    "Writing code...",
    "Almost there...",
    "Fixing a bug.",
    "Refactoring...",
    "Tests are passing!",
  ],
  [AgentState.Discussing]: [
    "What do you think?",
    "Good point!",
    "Let's discuss.",
    "I agree with that.",
    "Let me explain...",
  ],
  [AgentState.Reviewing]: [
    "Reviewing the PR...",
    "Looks good overall.",
    "Found something.",
    "LGTM!",
    "Small suggestion...",
  ],
  [AgentState.Walking]: [
    "On my way.",
    "Heading over.",
    "Be right back.",
  ],
  [AgentState.Meeting]: [
    "Syncing up.",
    "Standup time!",
    "Let's align.",
    "Sprint planning.",
    "Retro time.",
  ],
};

/** Meeting locations in tile coordinates. */
const MEETING_SPOTS = [
  { x: 30, y: 12 },
  { x: 45, y: 12 },
  { x: 60, y: 12 },
  { x: 30, y: 40 },
  { x: 45, y: 40 },
];

export class SimulationEngine {
  readonly agentManager: AgentManager;
  readonly orgManager: OrgManager;
  readonly taskManager: TaskManager;
  readonly messageBus: MessageBus;

  private config: SimulationConfig;
  private tick = 0;
  private running = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: SimulationEventHandler[] = [];
  private pendingSpeech: Map<string, { text: string; style: "normal" | "thinking" | "exclaim"; expiresAt: number }> = new Map();
  private agentActivityTimers: Map<string, number> = new Map();
  private paused = false;
  private speed = 1;

  constructor(config?: Partial<SimulationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentManager = new AgentManager();
    this.orgManager = new OrgManager();
    this.taskManager = new TaskManager();
    this.messageBus = new MessageBus();
  }

  /** Initialize all subsystems. */
  initialize(): void {
    this.agentManager.initialize();
    this.orgManager.initialize(this.agentManager);

    // Initialize messaging channels
    const teamIds = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
    const allAgentIds = this.agentManager.getAll().map((a) => a.id);
    this.messageBus.initializeDefaults(teamIds, allAgentIds);

    // Set initial activity timers
    for (const agent of this.agentManager.getAll()) {
      this.agentActivityTimers.set(agent.id, 0);
    }
  }

  /** Start the simulation loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.tickTimer = setInterval(() => {
      if (!this.paused) {
        this.processTick();
      }
    }, this.config.tickIntervalMs / this.speed);
  }

  /** Stop the simulation loop. */
  stop(): void {
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** Pause/resume. */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** Set simulation speed multiplier. */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(4, speed));
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /** Register an event handler. */
  onEvent(handler: SimulationEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /** Submit a new user task into the system. */
  submitTask(title: string, description: string): Task {
    const task = this.taskManager.createStrategicTask(title, description);

    // CEO picks up the task
    const ceo = this.agentManager.get("ceo-morgan");
    if (ceo) {
      ceo.setState(AgentState.Thinking);
      ceo.assignTask(task.id);
      this.emitSpeech(ceo.id, "New task! Let me review this.", "exclaim");
    }

    // After a delay, begin the delegation chain
    this.scheduleAgentActivity(
      "ceo-morgan",
      this.config.agentThinkDurationMs,
      () => this.ceoDelegate(task)
    );

    this.emitEvent({
      type: "task-updated",
      payload: { task },
    });

    return task;
  }

  /** Get a full game state snapshot. */
  getGameState(): GameState {
    const characters: CharacterSprite[] = this.agentManager
      .getAll()
      .map((agent) => ({
        agentId: agent.id,
        spriteSheet: agent.role,
        animations: {} as CharacterSprite["animations"],
        position: agent.position,
        direction: agent.direction,
        currentAnimation: agent.state,
      }));

    const speechBubbles: SpeechBubble[] = [];
    const now = Date.now();
    for (const [agentId, speech] of this.pendingSpeech.entries()) {
      if (speech.expiresAt > now) {
        speechBubbles.push({
          agentId,
          text: speech.text,
          duration: speech.expiresAt - now,
          style: speech.style,
        });
      } else {
        this.pendingSpeech.delete(agentId);
      }
    }

    return {
      tick: this.tick,
      timestamp: now,
      characters,
      speechBubbles,
      tilemap: {
        width: 80,
        height: 60,
        tileSize: 16,
        layers: [],
        rooms: [],
      },
    };
  }

  /** Get current tick count. */
  getTick(): number {
    return this.tick;
  }

  get isRunning(): boolean {
    return this.running && !this.paused;
  }

  // ── Core tick logic ───────────────────────────────────────

  private processTick(): void {
    this.tick++;
    const agents = this.agentManager.getAll();

    for (const agent of agents) {
      this.processAgentTick(agent);
    }

    // Process scheduled activities
    this.processScheduledActivities();
  }

  private processAgentTick(agent: Agent): void {
    const timeSinceStateChange = agent.timeInCurrentState;

    switch (agent.state) {
      case AgentState.Idle:
        this.processIdleAgent(agent);
        break;
      case AgentState.Thinking:
        if (timeSinceStateChange > this.config.agentThinkDurationMs) {
          this.transitionFromThinking(agent);
        }
        break;
      case AgentState.Coding:
        if (timeSinceStateChange > this.config.agentCodeDurationMs) {
          this.transitionFromCoding(agent);
        }
        break;
      case AgentState.Meeting:
        if (timeSinceStateChange > this.config.agentMeetingDurationMs) {
          agent.setState(AgentState.Idle);
          this.emitStateChange(agent.id, AgentState.Meeting, AgentState.Idle);
        }
        break;
      case AgentState.Reviewing:
        if (timeSinceStateChange > this.config.agentReviewDurationMs) {
          this.transitionFromReviewing(agent);
        }
        break;
      case AgentState.Discussing:
        if (timeSinceStateChange > this.config.agentThinkDurationMs) {
          agent.setState(AgentState.Idle);
          this.emitStateChange(agent.id, AgentState.Discussing, AgentState.Idle);
        }
        break;
      case AgentState.Walking:
        // Walking is handled by the UI; engine just tracks the target
        break;
    }
  }

  private processIdleAgent(agent: Agent): void {
    // Random chance of activity
    const rand = Math.random();

    if (rand < this.config.movementChance) {
      // Wander near desk
      this.agentWander(agent);
    } else if (rand < this.config.movementChance + this.config.interactionChance) {
      // Start an interaction
      this.startRandomInteraction(agent);
    } else if (rand < 0.02 && agent.currentTaskId) {
      // Work on assigned task
      this.workOnTask(agent);
    } else if (rand < 0.01) {
      // Random idle speech
      this.randomIdleSpeech(agent);
    }
  }

  private transitionFromThinking(agent: Agent): void {
    if (agent.currentTaskId) {
      // Start coding after thinking
      agent.setState(AgentState.Coding);
      this.emitStateChange(agent.id, AgentState.Thinking, AgentState.Coding);
      this.emitSpeech(agent.id, this.getPhrase(agent, AgentState.Coding), "normal");
    } else {
      agent.setState(AgentState.Idle);
      this.emitStateChange(agent.id, AgentState.Thinking, AgentState.Idle);
    }
  }

  private transitionFromCoding(agent: Agent): void {
    if (agent.currentTaskId) {
      // Simulate completing a coding session
      const task = this.taskManager.get(agent.currentTaskId);
      if (task && task.status === TaskStatus.InProgress) {
        // Move to review
        this.taskManager.updateStatus(task.id, TaskStatus.InReview);
        agent.setState(AgentState.Idle);
        this.emitSpeech(agent.id, "Done coding! Ready for review.", "normal");
        this.emitStateChange(agent.id, AgentState.Coding, AgentState.Idle);
        this.emitEvent({ type: "task-updated", payload: { task } });

        // Find a reviewer (QA on the team)
        this.requestReview(agent, task);
      }
    } else {
      agent.setState(AgentState.Idle);
      this.emitStateChange(agent.id, AgentState.Coding, AgentState.Idle);
    }
  }

  private transitionFromReviewing(agent: Agent): void {
    agent.setState(AgentState.Idle);
    this.emitSpeech(agent.id, this.getPhrase(agent, AgentState.Reviewing), "normal");
    this.emitStateChange(agent.id, AgentState.Reviewing, AgentState.Idle);
  }

  private agentWander(agent: Agent): void {
    if (!agent.desk) return;
    const offsetX = Math.floor(Math.random() * 5) - 2;
    const offsetY = Math.floor(Math.random() * 5) - 2;
    const newX = agent.desk.tileX + offsetX;
    const newY = agent.desk.tileY + offsetY;

    agent.setPosition(newX, newY);
    agent.setState(AgentState.Walking);
    this.emitEvent({
      type: "agent-moved",
      payload: { agentId: agent.id, x: newX, y: newY },
    });

    // Return to idle after a bit
    setTimeout(() => {
      if (agent.state === AgentState.Walking) {
        agent.setState(AgentState.Idle);
        agent.setPosition(agent.desk!.tileX, agent.desk!.tileY);
        this.emitEvent({
          type: "agent-moved",
          payload: { agentId: agent.id, x: agent.desk!.tileX, y: agent.desk!.tileY },
        });
        this.emitStateChange(agent.id, AgentState.Walking, AgentState.Idle);
      }
    }, 2000);
  }

  private startRandomInteraction(agent: Agent): void {
    const teammates = this.agentManager
      .getByTeam(agent.teamId)
      .filter((a) => a.id !== agent.id && a.state === AgentState.Idle);

    if (teammates.length === 0) return;

    const partner = teammates[Math.floor(Math.random() * teammates.length)];
    agent.setState(AgentState.Discussing);
    partner.setState(AgentState.Discussing);

    this.emitSpeech(agent.id, this.getPhrase(agent, AgentState.Discussing), "normal");
    this.emitStateChange(agent.id, AgentState.Idle, AgentState.Discussing);
    this.emitStateChange(partner.id, AgentState.Idle, AgentState.Discussing);

    // Send a message
    this.messageBus.sendDirect(
      agent.id,
      partner.id,
      this.getPhrase(agent, AgentState.Discussing)
    );

    setTimeout(() => {
      this.emitSpeech(partner.id, this.getPhrase(partner, AgentState.Discussing), "normal");
    }, 1500);
  }

  private workOnTask(agent: Agent): void {
    const task = this.taskManager.get(agent.currentTaskId!);
    if (!task) return;

    if (task.status === TaskStatus.Planning) {
      agent.setState(AgentState.Thinking);
      this.emitSpeech(agent.id, this.getPhrase(agent, AgentState.Thinking), "thinking");
      this.emitStateChange(agent.id, AgentState.Idle, AgentState.Thinking);
      this.taskManager.updateStatus(task.id, TaskStatus.InProgress);
    } else if (task.status === TaskStatus.InProgress) {
      agent.setState(AgentState.Coding);
      this.emitSpeech(agent.id, this.getPhrase(agent, AgentState.Coding), "normal");
      this.emitStateChange(agent.id, AgentState.Idle, AgentState.Coding);
    }
  }

  private requestReview(agent: Agent, task: Task): void {
    const qaAgents = this.agentManager
      .getByTeam(agent.teamId)
      .filter(
        (a) => a.role === AgentRole.QA || a.role === AgentRole.Tester
      );

    if (qaAgents.length > 0) {
      const reviewer = qaAgents[0];
      reviewer.setState(AgentState.Reviewing);
      reviewer.assignTask(task.id);
      this.emitSpeech(reviewer.id, "Reviewing the code...", "normal");
      this.emitStateChange(reviewer.id, reviewer.state, AgentState.Reviewing);
    }
  }

  private randomIdleSpeech(agent: Agent): void {
    const usePersonal = Math.random() < 0.3;
    if (usePersonal && agent.persona.catchphrases.length > 0) {
      const phrase =
        agent.persona.catchphrases[
          Math.floor(Math.random() * agent.persona.catchphrases.length)
        ];
      this.emitSpeech(agent.id, phrase, "normal");
    } else {
      this.emitSpeech(
        agent.id,
        this.getPhrase(agent, AgentState.Idle),
        "normal"
      );
    }
  }

  // ── CEO delegation chain ──────────────────────────────────

  private ceoDelegate(task: Task): void {
    const ceo = this.agentManager.get("ceo-morgan")!;
    ceo.setState(AgentState.Discussing);
    this.emitStateChange(ceo.id, AgentState.Thinking, AgentState.Discussing);
    this.emitSpeech(ceo.id, "Delegating to CTO. This needs technical planning.", "normal");

    this.taskManager.updateStatus(task.id, TaskStatus.Planning);
    this.taskManager.assign(task.id, "cto-aria");

    const cto = this.agentManager.get("cto-aria")!;
    cto.setState(AgentState.Thinking);
    cto.assignTask(task.id);
    this.emitStateChange(cto.id, AgentState.Idle, AgentState.Thinking);
    this.emitSpeech(cto.id, "Let me architect this...", "thinking");

    this.messageBus.sendDirect(
      ceo.id,
      cto.id,
      `New strategic task: "${task.title}". Please create a technical plan.`,
      MessageType.TaskAssign
    );

    this.scheduleAgentActivity(
      "cto-aria",
      this.config.agentThinkDurationMs,
      () => this.ctoDecompose(task)
    );

    // CEO goes back to idle
    setTimeout(() => {
      ceo.setState(AgentState.Idle);
      ceo.assignTask(null);
      this.emitStateChange(ceo.id, AgentState.Discussing, AgentState.Idle);
    }, 3000);
  }

  private ctoDecompose(task: Task): void {
    const cto = this.agentManager.get("cto-aria")!;
    cto.setState(AgentState.Discussing);
    this.emitSpeech(cto.id, "Breaking this into team tasks.", "normal");

    // Create sub-tasks for relevant teams
    const subtasks = this.generateSubtasks(task);
    const assigneeMap: Record<string, string> = {};

    for (const sub of subtasks) {
      if (sub.suggestedAssignee) {
        assigneeMap[sub.title] = sub.suggestedAssignee;
      }
    }

    const children = this.taskManager.decompose(task.id, subtasks, assigneeMap);

    // Delegate to staff managers
    this.messageBus.sendDirect(
      cto.id,
      "staff-mgr-jordan",
      `Technical plan ready for "${task.title}". ${children.length} sub-tasks created. Please coordinate.`,
      MessageType.TaskAssign
    );

    const staffMgr = this.agentManager.get("staff-mgr-jordan")!;
    staffMgr.setState(AgentState.Thinking);
    this.emitStateChange(staffMgr.id, AgentState.Idle, AgentState.Thinking);
    this.emitSpeech(staffMgr.id, "Coordinating the teams...", "thinking");

    // Staff manager delegates to team managers
    this.scheduleAgentActivity(
      "staff-mgr-jordan",
      this.config.agentThinkDurationMs,
      () => this.staffManagerDelegate(children)
    );

    // CTO goes back to idle
    setTimeout(() => {
      cto.setState(AgentState.Idle);
      cto.assignTask(null);
      this.emitStateChange(cto.id, AgentState.Discussing, AgentState.Idle);
    }, 3000);
  }

  private staffManagerDelegate(tasks: Task[]): void {
    const staffMgr = this.agentManager.get("staff-mgr-jordan")!;
    staffMgr.setState(AgentState.Discussing);
    this.emitSpeech(staffMgr.id, "Assigning to team managers.", "normal");

    const teams = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
    const teamManagers: Record<string, string> = {
      alpha: "alpha-mgr-priya",
      beta: "beta-mgr-devon",
      gamma: "gamma-mgr-iris",
      delta: "delta-mgr-chen",
      epsilon: "epsilon-mgr-nora",
      zeta: "zeta-mgr-diana",
    };

    // Distribute tasks across teams round-robin
    for (let i = 0; i < tasks.length; i++) {
      const teamId = teams[i % teams.length];
      const managerId = teamManagers[teamId];
      const task = tasks[i];

      this.taskManager.assign(task.id, managerId);

      const manager = this.agentManager.get(managerId)!;
      manager.setState(AgentState.Thinking);
      manager.assignTask(task.id);
      this.emitStateChange(manager.id, AgentState.Idle, AgentState.Thinking);
      this.emitSpeech(manager.id, `Reviewing task: ${task.title}`, "thinking");

      this.messageBus.sendDirect(
        staffMgr.id,
        managerId,
        `Assigned task: "${task.title}". Please plan and delegate to your team.`,
        MessageType.TaskAssign
      );

      // Each team manager delegates to their team
      this.scheduleAgentActivity(
        managerId,
        this.config.agentThinkDurationMs + i * 2000,
        () => this.teamManagerDelegate(managerId, task)
      );
    }

    setTimeout(() => {
      staffMgr.setState(AgentState.Idle);
      this.emitStateChange(staffMgr.id, AgentState.Discussing, AgentState.Idle);
    }, 3000);
  }

  private teamManagerDelegate(managerId: string, task: Task): void {
    const manager = this.agentManager.get(managerId)!;
    manager.setState(AgentState.Meeting);
    this.emitSpeech(manager.id, "Team standup! New task incoming.", "exclaim");
    this.emitStateChange(manager.id, AgentState.Thinking, AgentState.Meeting);

    // Find developers on this team
    const teamMembers = this.agentManager.getByTeam(manager.teamId);
    const developers = teamMembers.filter(
      (a) =>
        a.role === AgentRole.Developer ||
        a.role === AgentRole.SeniorDeveloper
    );

    // Create implementation sub-tasks
    const implTasks = this.generateImplementationTasks(task, developers);
    const assigneeMap: Record<string, string> = {};

    for (const impl of implTasks) {
      if (impl.suggestedAssignee) {
        assigneeMap[impl.title] = impl.suggestedAssignee;
      }
    }

    const children = this.taskManager.decompose(task.id, implTasks, assigneeMap);

    // Assign to developers
    for (let i = 0; i < children.length && i < developers.length; i++) {
      const dev = developers[i];
      const childTask = children[i];

      this.taskManager.assign(childTask.id, dev.id);
      dev.assignTask(childTask.id);
      dev.setState(AgentState.Thinking);
      this.emitStateChange(dev.id, AgentState.Idle, AgentState.Thinking);
      this.emitSpeech(dev.id, `Working on: ${childTask.title}`, "normal");

      this.messageBus.sendDirect(
        manager.id,
        dev.id,
        `Please implement: "${childTask.title}" — ${childTask.description}`,
        MessageType.TaskAssign
      );

      // Developer starts working
      this.scheduleAgentActivity(
        dev.id,
        this.config.agentThinkDurationMs + i * 3000,
        () => {
          dev.setState(AgentState.Coding);
          this.taskManager.updateStatus(childTask.id, TaskStatus.InProgress);
          this.emitStateChange(dev.id, AgentState.Thinking, AgentState.Coding);
          this.emitSpeech(dev.id, this.getPhrase(dev, AgentState.Coding), "normal");
        }
      );
    }

    // Notify PM
    const pm = teamMembers.find((a) => a.role === AgentRole.PM);
    if (pm) {
      pm.setState(AgentState.Thinking);
      this.emitSpeech(pm.id, "Updating project board.", "normal");
      this.emitStateChange(pm.id, AgentState.Idle, AgentState.Thinking);
      setTimeout(() => {
        pm.setState(AgentState.Idle);
        this.emitStateChange(pm.id, AgentState.Thinking, AgentState.Idle);
      }, 4000);
    }

    // Manager goes back to idle after meeting
    setTimeout(() => {
      manager.setState(AgentState.Idle);
      manager.assignTask(null);
      this.emitStateChange(manager.id, AgentState.Meeting, AgentState.Idle);
    }, this.config.agentMeetingDurationMs);
  }

  // ── Task generation helpers ───────────────────────────────

  private generateSubtasks(task: Task): import("@swarm/types").SubTask[] {
    const desc = task.description.toLowerCase();
    const subs: import("@swarm/types").SubTask[] = [
      {
        title: `Design architecture for ${task.title}`,
        description: `Create high-level architecture and component design for: ${task.description}`,
        estimatedComplexity: "medium",
        requiredSkills: ["architecture", "design"],
        suggestedAssignee: "alpha-mgr-priya",
      },
      {
        title: `Implement core backend for ${task.title}`,
        description: `Build the backend services, APIs, and data layer for: ${task.description}`,
        estimatedComplexity: "large",
        requiredSkills: ["backend", "api"],
        suggestedAssignee: "beta-mgr-devon",
      },
      {
        title: `Build frontend UI for ${task.title}`,
        description: `Create the user interface and frontend components for: ${task.description}`,
        estimatedComplexity: "large",
        requiredSkills: ["frontend", "ui"],
        suggestedAssignee: "alpha-mgr-priya",
      },
    ];

    if (desc.includes("data") || desc.includes("infrastructure")) {
      subs.push({
        title: `Set up infrastructure for ${task.title}`,
        description: `Configure infrastructure, data pipelines, and platform services for: ${task.description}`,
        estimatedComplexity: "medium",
        requiredSkills: ["infrastructure", "devops"],
        suggestedAssignee: "gamma-mgr-iris",
      });
    }

    if (desc.includes("security") || desc.includes("auth") || desc.includes("login") || desc.includes("encrypt") || desc.includes("vulnerability") || desc.includes("compliance")) {
      subs.push({
        title: `Security review for ${task.title}`,
        description: `Perform security audit, threat modeling, and hardening for: ${task.description}`,
        estimatedComplexity: "medium",
        requiredSkills: ["security", "auth"],
        suggestedAssignee: "zeta-mgr-diana",
      });
    }

    subs.push({
      title: `QA and testing for ${task.title}`,
      description: `Create test plans, write tests, and verify quality for: ${task.description}`,
      estimatedComplexity: "medium",
      requiredSkills: ["testing", "qa"],
      suggestedAssignee: "delta-mgr-chen",
    });

    return subs;
  }

  private generateImplementationTasks(
    task: Task,
    developers: Agent[]
  ): import("@swarm/types").SubTask[] {
    const subs: import("@swarm/types").SubTask[] = [];
    const taskParts = ["core logic", "data models", "integration"];

    for (let i = 0; i < Math.min(taskParts.length, developers.length); i++) {
      subs.push({
        title: `${taskParts[i]} — ${task.title}`,
        description: `Implement ${taskParts[i]} for: ${task.description}`,
        estimatedComplexity: "medium",
        requiredSkills: ["coding"],
        suggestedAssignee: developers[i].id,
      });
    }

    return subs;
  }

  // ── Scheduling & helpers ──────────────────────────────────

  private scheduledActivities: Array<{
    agentId: string;
    executeAt: number;
    callback: () => void;
  }> = [];

  private scheduleAgentActivity(
    agentId: string,
    delayMs: number,
    callback: () => void
  ): void {
    this.scheduledActivities.push({
      agentId,
      executeAt: Date.now() + delayMs,
      callback,
    });
  }

  private processScheduledActivities(): void {
    const now = Date.now();
    const ready = this.scheduledActivities.filter(
      (a) => a.executeAt <= now
    );
    this.scheduledActivities = this.scheduledActivities.filter(
      (a) => a.executeAt > now
    );
    for (const activity of ready) {
      activity.callback();
    }
  }

  private getPhrase(agent: Agent, state: AgentState): string {
    // Sometimes use catchphrases
    if (Math.random() < 0.4 && agent.persona.catchphrases.length > 0) {
      return agent.persona.catchphrases[
        Math.floor(Math.random() * agent.persona.catchphrases.length)
      ];
    }
    const phrases = STATE_PHRASES[state];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  private emitSpeech(
    agentId: string,
    text: string,
    style: "normal" | "thinking" | "exclaim"
  ): void {
    this.pendingSpeech.set(agentId, {
      text,
      style,
      expiresAt: Date.now() + this.config.speechDurationMs,
    });
    this.emitEvent({
      type: "agent-speech",
      payload: {
        agentId,
        text,
        style,
        duration: this.config.speechDurationMs,
      },
    });
  }

  private emitStateChange(
    agentId: string,
    previousState: AgentState,
    newState: AgentState
  ): void {
    this.emitEvent({
      type: "agent-state-changed",
      payload: { agentId, previousState, newState },
    });
  }

  private emitEvent(event: SimulationEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}
