// ============================================================
// @swarm/engine — Public API
// ============================================================

export { Agent, AgentManager, PERSONAS, AGENT_ROLES, AGENT_TEAMS } from "./agents/index.js";
export type { AgentPosition, DeskAssignment } from "./agents/index.js";

export { OrgManager } from "./org/index.js";

export { TaskManager } from "./tasks/index.js";

export { MessageBus } from "./messages/index.js";
export type { MessageHandler } from "./messages/index.js";

export { LLMClient } from "./llm/index.js";
export type { LLMMessage, LLMResponse, LLMRequest } from "./llm/index.js";

export {
  SimulationEngine,
} from "./simulation/index.js";
export type {
  SimulationEvent,
  SimulationEventHandler,
  SimulationConfig,
} from "./simulation/index.js";

export { version } from "./version.js";
