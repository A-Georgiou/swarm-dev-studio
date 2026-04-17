// ============================================================
// Org Structure Types — teams and organisational chart
// ============================================================

import type { AgentRole, AgentPersona } from "./agent.js";

/** An agent registered in the organisation. */
export interface AgentDefinition {
  id: string;
  role: AgentRole;
  persona: AgentPersona;
  teamId: string;
}

/** A team containing members led by a manager. */
export interface Team {
  id: string;
  name: string;
  managerId: string;
  members: string[];
}

/** The complete organisational chart. */
export interface OrgChart {
  ceo: string;
  cto: string;
  staffManagers: string[];
  seniorManagers: string[];
  teams: Team[];
}
