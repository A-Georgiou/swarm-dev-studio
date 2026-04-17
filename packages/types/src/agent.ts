// ============================================================
// Agent Types — roles, personas, and runtime states
// ============================================================

/** Every role that can appear in the organisational hierarchy. */
export enum AgentRole {
  CEO = "ceo",
  CTO = "cto",
  StaffManager = "staff_manager",
  SeniorManager = "senior_manager",
  Manager = "manager",
  PM = "pm",
  Developer = "developer",
  SeniorDeveloper = "senior_developer",
  QA = "qa",
  Tester = "tester",
}

/** Big-Five personality trait scores (each 0-1). */
export interface BigFiveTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

/** Defines an agent's personality and LLM configuration. */
export interface AgentPersona {
  name: string;
  title: string;
  personality: BigFiveTraits;
  communicationStyle: string;
  catchphrases: string[];
  modelAssignment: string;
}

/** Observable agent states shown in the game UI. */
export enum AgentState {
  Idle = "idle",
  Thinking = "thinking",
  Coding = "coding",
  Discussing = "discussing",
  Reviewing = "reviewing",
  Walking = "walking",
  Meeting = "meeting",
}
