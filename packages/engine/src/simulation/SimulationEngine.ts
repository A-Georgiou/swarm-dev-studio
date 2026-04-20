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
  type SpriteAnimation,
  type TilemapLayer,
  type OfficeRoom,
  type Task,
} from "@swarm/types";
import { AgentManager } from "../agents/AgentManager.js";
import { Agent } from "../agents/Agent.js";
import { OrgManager } from "../org/OrgManager.js";
import { TaskManager } from "../tasks/TaskManager.js";
import { MessageBus } from "../messages/MessageBus.js";
import { LLMClient } from "../llm/LLMClient.js";

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
  { x: 60, y: 40 },
];

/** Build a proper animations record for a character sprite sheet. */
function buildAnimations(role: string): Record<AgentState, SpriteAnimation> {
  const prefix = role.replace(/_/g, "-");
  return {
    [AgentState.Idle]:       { name: `${prefix}_idle`,           frames: [0, 1],       frameRate: 2,  loop: true },
    [AgentState.Walking]:    { name: `${prefix}_walk-down`,      frames: [0, 1, 2, 3], frameRate: 6,  loop: true },
    [AgentState.Thinking]:   { name: `${prefix}_thinking`,       frames: [0, 1],       frameRate: 2,  loop: true },
    [AgentState.Coding]:     { name: `${prefix}_sitting-coding`, frames: [0, 1, 2, 3], frameRate: 4,  loop: true },
    [AgentState.Discussing]: { name: `${prefix}_talking`,        frames: [0, 1, 2, 3], frameRate: 4,  loop: true },
    [AgentState.Reviewing]:  { name: `${prefix}_sitting-coding`, frames: [0, 1, 2, 3], frameRate: 3,  loop: true },
    [AgentState.Meeting]:    { name: `${prefix}_talking`,        frames: [0, 1, 2, 3], frameRate: 4,  loop: true },
  };
}

/** Static office rooms derived from the office tilemap layout. */
const OFFICE_ROOMS: OfficeRoom[] = [
  { id: "executive",   name: "Executive Suite",       bounds: { x: 0,  y: 0,  width: 12, height: 12 }, type: "office" },
  { id: "management",  name: "Management Area",       bounds: { x: 12, y: 0,  width: 12, height: 12 }, type: "office" },
  { id: "alpha",       name: "Team Alpha",            bounds: { x: 16, y: 14, width: 12, height: 12 }, type: "open_space" },
  { id: "beta",        name: "Team Beta",             bounds: { x: 40, y: 14, width: 12, height: 12 }, type: "open_space" },
  { id: "gamma",       name: "Team Gamma",            bounds: { x: 56, y: 14, width: 12, height: 12 }, type: "open_space" },
  { id: "delta",       name: "Team Delta",            bounds: { x: 16, y: 32, width: 12, height: 12 }, type: "open_space" },
  { id: "epsilon",     name: "Team Epsilon",          bounds: { x: 40, y: 32, width: 12, height: 12 }, type: "open_space" },
  { id: "zeta",        name: "Team Zeta",             bounds: { x: 56, y: 32, width: 12, height: 12 }, type: "open_space" },
  { id: "leader_mtg",  name: "Leadership Meeting",    bounds: { x: 4,  y: 38, width: 8,  height: 6 },  type: "meeting_room" },
  { id: "large_mtg",   name: "Large Meeting Room",    bounds: { x: 32, y: 52, width: 10, height: 6 },  type: "meeting_room" },
  { id: "small_mtg_1", name: "Small Meeting Room 1",  bounds: { x: 46, y: 52, width: 6,  height: 6 },  type: "meeting_room" },
  { id: "small_mtg_2", name: "Small Meeting Room 2",  bounds: { x: 58, y: 52, width: 6,  height: 6 },  type: "meeting_room" },
  { id: "small_mtg_3", name: "Small Meeting Room 3",  bounds: { x: 70, y: 52, width: 6,  height: 6 },  type: "meeting_room" },
  { id: "break_room",  name: "Break Room",            bounds: { x: 0,  y: 52, width: 10, height: 8 },  type: "break_room" },
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
  private tilemapLayers: TilemapLayer[] = [];
  private llmClient: LLMClient;

  constructor(config?: Partial<SimulationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentManager = new AgentManager();
    this.orgManager = new OrgManager();
    this.taskManager = new TaskManager();
    this.messageBus = new MessageBus();
    this.llmClient = new LLMClient();
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

    // Build tilemap layer stubs for the game state
    // The actual tile data lives in the JSON asset; here we provide
    // structural metadata so the UI knows which layers exist.
    const tileCount = 80 * 60;
    this.tilemapLayers = [
      { name: "floor",     data: new Array(tileCount).fill(12), visible: true },
      { name: "walls",     data: new Array(tileCount).fill(0),  visible: true },
      { name: "furniture", data: new Array(tileCount).fill(0),  visible: true },
      { name: "above",     data: new Array(tileCount).fill(0),  visible: true },
    ];
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
        animations: buildAnimations(agent.role),
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
        layers: this.tilemapLayers,
        rooms: OFFICE_ROOMS,
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
    const rand = Math.random();

    if (rand < this.config.movementChance) {
      this.agentWander(agent);
    } else if (rand < this.config.movementChance + this.config.interactionChance) {
      this.startRandomInteraction(agent);
    } else if (rand < 0.02 && agent.currentTaskId) {
      this.workOnTask(agent);
    } else if (rand < 0.015) {
      // LLM-powered thinking: agent reflects on current work
      this.agentThink(agent, "What should I focus on right now? Reflect briefly on your priorities.")
        .then((thought) => {
          this.emitSpeech(agent.id, thought.substring(0, 100), "thinking");
        })
        .catch(() => {
          this.randomIdleSpeech(agent);
        });
    } else if (rand < 0.01) {
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
    this.scheduleAgentActivity(agent.id, 2000, () => {
      if (agent.state === AgentState.Walking) {
        agent.setState(AgentState.Idle);
        agent.setPosition(agent.desk!.tileX, agent.desk!.tileY);
        this.emitEvent({
          type: "agent-moved",
          payload: { agentId: agent.id, x: agent.desk!.tileX, y: agent.desk!.tileY },
        });
        this.emitStateChange(agent.id, AgentState.Walking, AgentState.Idle);
      }
    });
  }

  private startRandomInteraction(agent: Agent): void {
    const teammates = this.agentManager
      .getByTeam(agent.teamId)
      .filter((a) => a.id !== agent.id && a.state === AgentState.Idle);

    if (teammates.length === 0) return;

    const partner = teammates[Math.floor(Math.random() * teammates.length)];
    agent.setState(AgentState.Discussing);
    partner.setState(AgentState.Discussing);

    // Use LLM to generate the conversation opener
    const topic = agent.currentTaskId
      ? `Discuss progress on the current task with ${partner.persona.name}.`
      : `Have a brief work discussion with ${partner.persona.name} about team priorities.`;

    this.agentThink(agent, topic)
      .then((opener) => {
        this.emitSpeech(agent.id, opener.substring(0, 100), "normal");
        this.messageBus.sendDirect(agent.id, partner.id, opener);

        // Partner responds using their own LLM
        this.scheduleAgentActivity(partner.id, 1500, () => {
          this.agentThink(partner, `${agent.persona.name} said: "${opener}". Respond briefly.`)
            .then((reply) => {
              this.emitSpeech(partner.id, reply.substring(0, 100), "normal");
              this.messageBus.sendDirect(partner.id, agent.id, reply);
            })
            .catch(() => {
              this.emitSpeech(partner.id, this.getPhrase(partner, AgentState.Discussing), "normal");
              this.messageBus.sendDirect(partner.id, agent.id, this.getPhrase(partner, AgentState.Discussing));
            });
        });
      })
      .catch(() => {
        // Fallback to static phrases
        this.emitSpeech(agent.id, this.getPhrase(agent, AgentState.Discussing), "normal");
        this.emitStateChange(agent.id, AgentState.Idle, AgentState.Discussing);
        this.emitStateChange(partner.id, AgentState.Idle, AgentState.Discussing);
        this.messageBus.sendDirect(agent.id, partner.id, this.getPhrase(agent, AgentState.Discussing));

        this.scheduleAgentActivity(partner.id, 1500, () => {
          this.emitSpeech(partner.id, this.getPhrase(partner, AgentState.Discussing), "normal");
          this.messageBus.sendDirect(partner.id, agent.id, this.getPhrase(partner, AgentState.Discussing));
        });
      });

    this.emitStateChange(agent.id, AgentState.Idle, AgentState.Discussing);
    this.emitStateChange(partner.id, AgentState.Idle, AgentState.Discussing);
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

  /**
   * Ask an agent's assigned LLM to generate a response for a given context.
   * The agent's persona (personality, style, role) is injected as the system prompt.
   * Falls back to local generation when API keys are unavailable.
   */
  private async agentThink(agent: Agent, context: string): Promise<string> {
    const persona = agent.persona;
    const systemPrompt = [
      `You are ${persona.name}, ${persona.title}.`,
      `Communication style: ${persona.communicationStyle}.`,
      `Personality (Big Five): openness: ${persona.personality.openness}, conscientiousness: ${persona.personality.conscientiousness}, extraversion: ${persona.personality.extraversion}, agreeableness: ${persona.personality.agreeableness}, neuroticism: ${persona.personality.neuroticism}.`,
      `Your catchphrases include: ${persona.catchphrases.join(", ")}.`,
      `Respond in character. Be concise (2-3 sentences max).`,
    ].join(" ");

    const response = await this.llmClient.chat({
      model: persona.modelAssignment,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
      maxTokens: 256,
      temperature: 0.7,
    });

    return response.content;
  }

  /** Get the LLM client instance (for testing/inspection). */
  getLLMClient(): LLMClient {
    return this.llmClient;
  }

  // ── Org hierarchy mapping ──────────────────────────────────

  /** Teams managed by each senior manager. */
  private static readonly SR_MGR_TEAMS: Record<string, string[]> = {
    "sr-mgr-alex": ["alpha", "beta"],
    "sr-mgr-sam": ["gamma", "delta", "epsilon", "zeta"],
  };

  /** Which staff manager oversees which senior managers. */
  private static readonly STAFF_MGR_REPORTS: Record<string, string[]> = {
    "staff-mgr-jordan": ["sr-mgr-alex", "sr-mgr-sam"],
    "staff-mgr-casey": ["sr-mgr-alex", "sr-mgr-sam"],
  };

  private static readonly TEAM_MANAGERS: Record<string, string> = {
    alpha: "alpha-mgr-priya",
    beta: "beta-mgr-devon",
    gamma: "gamma-mgr-iris",
    delta: "delta-mgr-chen",
    epsilon: "epsilon-mgr-nora",
    zeta: "zeta-mgr-diana",
  };

  // ── CEO delegation chain ──────────────────────────────────

  private ceoDelegate(task: Task): void {
    const ceo = this.agentManager.get("ceo-morgan")!;
    ceo.setState(AgentState.Discussing);
    this.emitStateChange(ceo.id, AgentState.Thinking, AgentState.Discussing);

    // CEO creates a planning document with strategic direction
    this.taskManager.createPlanningDoc(task.id, ceo.id, {
      summary: `Strategic goal: ${task.title}`,
      analysis: `User request received: ${task.description}. Routing to CTO for technical decomposition.`,
      approach: "Delegate to CTO for architecture, then distribute through management chain.",
      decomposition: [],
      risks: ["Scope creep", "Cross-team dependencies"],
      dependencies: [],
    });

    this.emitSpeech(ceo.id, "Delegating to CTO. This needs technical planning.", "normal");

    this.taskManager.updateStatus(task.id, TaskStatus.Planning);
    this.taskManager.assign(task.id, "cto-aria");

    const cto = this.agentManager.get("cto-aria")!;
    cto.setState(AgentState.Thinking);
    cto.assignTask(task.id);
    this.emitStateChange(cto.id, AgentState.Idle, AgentState.Thinking);
    this.emitSpeech(cto.id, "Let me architect this...", "thinking");

    // CEO → CTO conversation
    const threadId = `thread-${task.id}-ceo-cto`;
    this.messageBus.sendDirect(
      ceo.id,
      cto.id,
      `New strategic task: "${task.title}". Please create a technical plan. Description: ${task.description}`,
      MessageType.TaskAssign
    );

    // CTO responds with acknowledgement
    this.scheduleAgentActivity(ceo.id, 1500, () => {
      this.messageBus.sendDirect(
        cto.id,
        ceo.id,
        `Understood. I'll analyze the architecture requirements and create a decomposition plan.`,
        MessageType.Chat
      );
      this.emitSpeech(cto.id, "I'll analyze the architecture.", "normal");
    });

    this.scheduleAgentActivity(
      "cto-aria",
      this.config.agentThinkDurationMs,
      () => this.ctoDecompose(task)
    );

    // CEO goes back to idle
    this.scheduleAgentActivity(ceo.id, 3000, () => {
      ceo.setState(AgentState.Idle);
      ceo.assignTask(null);
      this.emitStateChange(ceo.id, AgentState.Discussing, AgentState.Idle);
    });
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

    // CTO creates planning document with technical decomposition
    this.taskManager.createPlanningDoc(task.id, cto.id, {
      summary: `Technical plan for: ${task.title}`,
      analysis: `Decomposed into ${children.length} sub-tasks across relevant teams.`,
      approach: "Distribute through staff managers: Jordan (delivery coordination) and Casey (quality assurance).",
      decomposition: subtasks,
      risks: ["Integration complexity across teams", "Data model consistency"],
      dependencies: children.map((c) => c.id),
    });

    // Separate tasks: delivery tasks go to Jordan, QA/testing tasks go to Casey
    const deliveryTasks: Task[] = [];
    const qualityTasks: Task[] = [];

    for (const child of children) {
      const desc = child.description.toLowerCase();
      if (desc.includes("test") || desc.includes("qa") || desc.includes("quality") || desc.includes("security review")) {
        qualityTasks.push(child);
      } else {
        deliveryTasks.push(child);
      }
    }

    // Delegate delivery tasks to Staff Manager Jordan
    const jordan = this.agentManager.get("staff-mgr-jordan")!;
    jordan.setState(AgentState.Thinking);
    this.emitStateChange(jordan.id, AgentState.Idle, AgentState.Thinking);
    this.emitSpeech(jordan.id, "Coordinating delivery teams...", "thinking");

    this.messageBus.sendDirect(
      cto.id,
      jordan.id,
      `Technical plan ready for "${task.title}". ${deliveryTasks.length} delivery tasks need coordination. Please route to senior managers.`,
      MessageType.TaskAssign
    );

    // Jordan acknowledges
    this.scheduleAgentActivity(jordan.id, 1500, () => {
      this.messageBus.sendDirect(
        jordan.id,
        cto.id,
        `Got it. I'll align the teams and ensure cross-team dependencies are handled.`,
        MessageType.Chat
      );
      this.emitSpeech(jordan.id, "Let me sync the teams.", "normal");
    });

    this.scheduleAgentActivity(
      jordan.id,
      this.config.agentThinkDurationMs,
      () => this.staffManagerJordanDelegate(deliveryTasks, task)
    );

    // Delegate quality tasks to Staff Manager Casey
    if (qualityTasks.length > 0) {
      const casey = this.agentManager.get("staff-mgr-casey")!;
      casey.setState(AgentState.Thinking);
      this.emitStateChange(casey.id, AgentState.Idle, AgentState.Thinking);
      this.emitSpeech(casey.id, "Reviewing quality requirements...", "thinking");

      this.messageBus.sendDirect(
        cto.id,
        casey.id,
        `Quality assurance needed for "${task.title}". ${qualityTasks.length} tasks require test plans and reviews.`,
        MessageType.TaskAssign
      );

      // Casey acknowledges
      this.scheduleAgentActivity(casey.id, 1500, () => {
        this.messageBus.sendDirect(
          casey.id,
          cto.id,
          `Quality is non-negotiable. I'll ensure comprehensive test coverage and review.`,
          MessageType.Chat
        );
        this.emitSpeech(casey.id, "Did we test this?", "normal");
      });

      this.scheduleAgentActivity(
        casey.id,
        this.config.agentThinkDurationMs,
        () => this.staffManagerCaseyDelegate(qualityTasks, task)
      );
    } else {
      // Even if no explicit QA tasks, Casey reviews overall quality
      const casey = this.agentManager.get("staff-mgr-casey")!;
      casey.setState(AgentState.Reviewing);
      this.emitStateChange(casey.id, AgentState.Idle, AgentState.Reviewing);
      this.emitSpeech(casey.id, "Let's review the metrics.", "normal");

      this.messageBus.sendDirect(
        cto.id,
        casey.id,
        `FYI: "${task.title}" is being delivered. Please oversee quality standards across teams.`,
        MessageType.Chat
      );

      this.scheduleAgentActivity(casey.id, this.config.agentReviewDurationMs, () => {
        casey.setState(AgentState.Idle);
        this.emitStateChange(casey.id, AgentState.Reviewing, AgentState.Idle);
      });
    }

    // CTO goes back to idle
    this.scheduleAgentActivity(cto.id, 3000, () => {
      cto.setState(AgentState.Idle);
      cto.assignTask(null);
      this.emitStateChange(cto.id, AgentState.Discussing, AgentState.Idle);
    });
  }

  /** Jordan routes delivery tasks through the correct senior manager. */
  private staffManagerJordanDelegate(tasks: Task[], parentTask: Task): void {
    const jordan = this.agentManager.get("staff-mgr-jordan")!;
    jordan.setState(AgentState.Discussing);
    this.emitSpeech(jordan.id, "Routing tasks to senior managers.", "normal");

    // Create planning doc
    this.taskManager.createPlanningDoc(parentTask.id, jordan.id, {
      summary: `Delivery coordination for: ${parentTask.title}`,
      analysis: `${tasks.length} delivery tasks. Routing through senior managers based on team alignment.`,
      approach: "Alex handles Alpha/Beta (frontend/backend), Sam handles Gamma/Delta/Epsilon/Zeta (data/QA/devops/security).",
      decomposition: [],
      risks: ["Cross-team integration timing"],
      dependencies: tasks.map((t) => t.id),
    });

    // Route each task to the right senior manager based on the assignee's team
    const alexTasks: Task[] = [];
    const samTasks: Task[] = [];

    for (const task of tasks) {
      const assigneeTeam = this.getTeamFromAssignee(task.assignedTo);
      if (SimulationEngine.SR_MGR_TEAMS["sr-mgr-alex"].includes(assigneeTeam)) {
        alexTasks.push(task);
      } else {
        samTasks.push(task);
      }
    }

    // Delegate to Senior Manager Alex
    if (alexTasks.length > 0) {
      this.delegateToSeniorManager("sr-mgr-alex", alexTasks, jordan.id);
    }

    // Delegate to Senior Manager Sam
    if (samTasks.length > 0) {
      this.delegateToSeniorManager("sr-mgr-sam", samTasks, jordan.id);
    }

    this.scheduleAgentActivity(jordan.id, 3000, () => {
      jordan.setState(AgentState.Idle);
      this.emitStateChange(jordan.id, AgentState.Discussing, AgentState.Idle);
    });
  }

  /** Casey routes quality/testing tasks through senior managers. */
  private staffManagerCaseyDelegate(tasks: Task[], parentTask: Task): void {
    const casey = this.agentManager.get("staff-mgr-casey")!;
    casey.setState(AgentState.Discussing);
    this.emitSpeech(casey.id, "Coordinating quality assurance.", "normal");

    this.taskManager.createPlanningDoc(parentTask.id, casey.id, {
      summary: `Quality plan for: ${parentTask.title}`,
      analysis: `${tasks.length} QA/testing tasks. Ensuring comprehensive test coverage.`,
      approach: "Route testing tasks through senior managers to reach the right teams.",
      decomposition: [],
      risks: ["Insufficient test coverage", "Missing edge cases"],
      dependencies: tasks.map((t) => t.id),
    });

    // Route through senior managers
    const alexTasks: Task[] = [];
    const samTasks: Task[] = [];

    for (const task of tasks) {
      const assigneeTeam = this.getTeamFromAssignee(task.assignedTo);
      if (SimulationEngine.SR_MGR_TEAMS["sr-mgr-alex"].includes(assigneeTeam)) {
        alexTasks.push(task);
      } else {
        samTasks.push(task);
      }
    }

    if (alexTasks.length > 0) {
      this.delegateToSeniorManager("sr-mgr-alex", alexTasks, casey.id);
    }
    if (samTasks.length > 0) {
      this.delegateToSeniorManager("sr-mgr-sam", samTasks, casey.id);
    }

    // Casey asks for quality confirmation
    this.scheduleAgentActivity(casey.id, 2000, () => {
      for (const task of tasks) {
        const managerId = SimulationEngine.TEAM_MANAGERS[this.getTeamFromAssignee(task.assignedTo)] ?? "";
        if (managerId) {
          this.messageBus.sendDirect(
            casey.id,
            managerId,
            `Please ensure test plans are created for: "${task.title}". Quality is non-negotiable.`,
            MessageType.Chat
          );
        }
      }
    });

    this.scheduleAgentActivity(casey.id, 4000, () => {
      casey.setState(AgentState.Idle);
      this.emitStateChange(casey.id, AgentState.Discussing, AgentState.Idle);
    });
  }

  /** Senior manager reviews and delegates to appropriate team managers. */
  private delegateToSeniorManager(srMgrId: string, tasks: Task[], fromId: string): void {
    const srMgr = this.agentManager.get(srMgrId)!;
    srMgr.setState(AgentState.Thinking);
    this.emitStateChange(srMgr.id, AgentState.Idle, AgentState.Thinking);
    this.emitSpeech(srMgr.id, `Reviewing ${tasks.length} tasks for my teams.`, "thinking");

    this.messageBus.sendDirect(
      fromId,
      srMgrId,
      `${tasks.length} tasks for your teams. Please review and delegate to team managers.`,
      MessageType.TaskAssign
    );

    // Sr Manager responds
    this.scheduleAgentActivity(srMgrId, 1500, () => {
      this.messageBus.sendDirect(
        srMgrId,
        fromId,
        `Reviewing now. I'll make sure teams are unblocked and aligned.`,
        MessageType.Chat
      );
      this.emitSpeech(srMgr.id, this.getPhrase(srMgr, AgentState.Thinking), "normal");
    });

    // Sr Manager delegates to team managers
    this.scheduleAgentActivity(srMgrId, this.config.agentThinkDurationMs, () => {
      srMgr.setState(AgentState.Meeting);
      this.emitStateChange(srMgr.id, AgentState.Thinking, AgentState.Meeting);
      this.emitSpeech(srMgr.id, "Meeting with team managers.", "normal");

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const teamId = this.getTeamFromAssignee(task.assignedTo);
        const managerId = SimulationEngine.TEAM_MANAGERS[teamId];
        if (!managerId) continue;

        this.taskManager.assign(task.id, managerId);

        this.messageBus.sendDirect(
          srMgrId,
          managerId,
          `Assigned task: "${task.title}". Please plan with your team and delegate. Context: ${task.description}`,
          MessageType.TaskAssign
        );

        const manager = this.agentManager.get(managerId)!;
        manager.setState(AgentState.Thinking);
        manager.assignTask(task.id);
        this.emitStateChange(manager.id, AgentState.Idle, AgentState.Thinking);
        this.emitSpeech(manager.id, `Reviewing task: ${task.title}`, "thinking");

        // Manager acknowledges to senior manager
        this.scheduleAgentActivity(managerId, 1500, () => {
          this.messageBus.sendDirect(
            managerId,
            srMgrId,
            `I'll review this with my team and create an implementation plan.`,
            MessageType.Chat
          );
        });

        // Team manager delegates to their team
        this.scheduleAgentActivity(
          managerId,
          this.config.agentThinkDurationMs + i * 2000,
          () => this.teamManagerDelegate(managerId, task)
        );
      }

      // Sr Manager goes idle
      this.scheduleAgentActivity(srMgrId, this.config.agentMeetingDurationMs, () => {
        srMgr.setState(AgentState.Idle);
        this.emitStateChange(srMgr.id, AgentState.Meeting, AgentState.Idle);
      });
    });
  }

  /** Team manager plans with their team and delegates to developers + QA. */
  private teamManagerDelegate(managerId: string, task: Task): void {
    const manager = this.agentManager.get(managerId)!;
    manager.setState(AgentState.Meeting);
    this.emitSpeech(manager.id, "Team standup! New task incoming.", "exclaim");
    this.emitStateChange(manager.id, AgentState.Thinking, AgentState.Meeting);

    const teamMembers = this.agentManager.getByTeam(manager.teamId);
    const developers = teamMembers.filter(
      (a) =>
        a.role === AgentRole.Developer ||
        a.role === AgentRole.SeniorDeveloper
    );
    const qa = teamMembers.find((a) => a.role === AgentRole.QA);
    const tester = teamMembers.find((a) => a.role === AgentRole.Tester);
    const pm = teamMembers.find((a) => a.role === AgentRole.PM);

    // Manager creates a planning doc for their team's work
    this.taskManager.createPlanningDoc(task.id, managerId, {
      summary: `Team ${manager.teamId} implementation plan for: ${task.title}`,
      analysis: `${developers.length} developers available. QA and tester will review.`,
      approach: `Senior dev leads implementation, junior devs handle specific modules. QA defines test criteria upfront.`,
      decomposition: this.generateImplementationTasks(task, developers),
      risks: ["Developer availability", "Unclear requirements"],
      dependencies: [],
    });

    // Create implementation sub-tasks
    const implTasks = this.generateImplementationTasks(task, developers);
    const assigneeMap: Record<string, string> = {};

    for (const impl of implTasks) {
      if (impl.suggestedAssignee) {
        assigneeMap[impl.title] = impl.suggestedAssignee;
      }
    }

    const children = this.taskManager.decompose(task.id, implTasks, assigneeMap);

    // PM updates project tracking
    if (pm) {
      pm.setState(AgentState.Thinking);
      this.emitSpeech(pm.id, "Updating project board.", "normal");
      this.emitStateChange(pm.id, AgentState.Idle, AgentState.Thinking);

      this.messageBus.sendDirect(
        manager.id,
        pm.id,
        `New task decomposed: "${task.title}". ${children.length} sub-tasks created. Please track progress.`,
        MessageType.Chat
      );

      // PM responds with update
      this.scheduleAgentActivity(pm.id, 2000, () => {
        this.messageBus.sendDirect(
          pm.id,
          manager.id,
          `Board updated. I'll track milestones and flag any blockers.`,
          MessageType.Chat
        );
        this.emitSpeech(pm.id, this.getPhrase(pm, AgentState.Thinking), "normal");
      });

      this.scheduleAgentActivity(pm.id, 4000, () => {
        pm.setState(AgentState.Idle);
        this.emitStateChange(pm.id, AgentState.Thinking, AgentState.Idle);
      });
    }

    // QA gets involved proactively in planning — defines acceptance criteria
    if (qa) {
      qa.setState(AgentState.Thinking);
      this.emitSpeech(qa.id, "Defining test criteria upfront.", "thinking");
      this.emitStateChange(qa.id, AgentState.Idle, AgentState.Thinking);

      this.messageBus.sendDirect(
        manager.id,
        qa.id,
        `New task: "${task.title}". Please define acceptance criteria and test plan before coding begins.`,
        MessageType.TaskAssign
      );

      // QA responds with test requirements
      this.scheduleAgentActivity(qa.id, 2000, () => {
        this.messageBus.sendDirect(
          qa.id,
          manager.id,
          `Test plan created. Key acceptance criteria defined. I'll review code when ready.`,
          MessageType.Chat
        );
        this.emitSpeech(qa.id, this.getPhrase(qa, AgentState.Thinking), "normal");

        // QA also communicates directly with developers
        for (const dev of developers) {
          this.messageBus.sendDirect(
            qa.id,
            dev.id,
            `Acceptance criteria for "${task.title}": ensure edge cases are covered. I'll review your PR.`,
            MessageType.Chat
          );
        }
      });

      this.scheduleAgentActivity(qa.id, 5000, () => {
        qa.setState(AgentState.Idle);
        this.emitStateChange(qa.id, AgentState.Thinking, AgentState.Idle);
      });
    }

    // Tester prepares test environment
    if (tester) {
      tester.setState(AgentState.Thinking);
      this.emitSpeech(tester.id, "Setting up test environment.", "normal");
      this.emitStateChange(tester.id, AgentState.Idle, AgentState.Thinking);

      this.messageBus.sendDirect(
        manager.id,
        tester.id,
        `Prepare test environment for: "${task.title}". Automated test suite needed.`,
        MessageType.Chat
      );

      this.scheduleAgentActivity(tester.id, 3000, () => {
        this.messageBus.sendDirect(
          tester.id,
          manager.id,
          `Test environment ready. Automated suite prepared. Will run on each PR.`,
          MessageType.Chat
        );
        this.emitSpeech(tester.id, this.getPhrase(tester, AgentState.Thinking), "normal");
        tester.setState(AgentState.Idle);
        this.emitStateChange(tester.id, AgentState.Thinking, AgentState.Idle);
      });
    }

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

      // Developer asks clarifying questions
      this.scheduleAgentActivity(dev.id, 2000 + i * 1000, () => {
        this.messageBus.sendDirect(
          dev.id,
          manager.id,
          `Quick question on "${childTask.title}" — should I prioritize performance or flexibility?`,
          MessageType.Chat
        );
        this.emitSpeech(dev.id, this.getPhrase(dev, AgentState.Discussing), "normal");
      });

      // Manager responds to developer question
      this.scheduleAgentActivity(manager.id, 3500 + i * 1000, () => {
        this.messageBus.sendDirect(
          manager.id,
          dev.id,
          `Good question. Prioritize correctness first, then optimize. Follow the team patterns.`,
          MessageType.Chat
        );
      });

      // Developer starts coding after discussion
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

    // Manager goes back to idle after meeting
    this.scheduleAgentActivity(manager.id, this.config.agentMeetingDurationMs, () => {
      manager.setState(AgentState.Idle);
      manager.assignTask(null);
      this.emitStateChange(manager.id, AgentState.Meeting, AgentState.Idle);
    });
  }

  /** Get team ID from an agent's assigned team (for routing). */
  private getTeamFromAssignee(assigneeId: string): string {
    const agent = this.agentManager.get(assigneeId);
    if (agent) return agent.teamId;
    // Extract team prefix from agent ID as fallback
    const prefix = assigneeId.split("-")[0];
    return prefix === "alpha" || prefix === "beta" || prefix === "gamma" ||
           prefix === "delta" || prefix === "epsilon" || prefix === "zeta"
      ? prefix : "alpha";
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
