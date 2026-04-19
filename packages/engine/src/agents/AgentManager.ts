// ============================================================
// AgentManager — creates and manages all agents in the swarm
// ============================================================

import { AgentRole, type AgentDefinition } from "@swarm/types";
import { Agent, type DeskAssignment } from "./Agent.js";
import { PERSONAS, AGENT_ROLES, AGENT_TEAMS } from "./personas.js";

/** Predefined desk positions for each team area (tile coords). */
const DESK_POSITIONS: Record<string, DeskAssignment[]> = {
  executive: [
    { tileX: 5, tileY: 5, direction: "down" },
    { tileX: 15, tileY: 5, direction: "down" },
    { tileX: 25, tileY: 5, direction: "down" },
    { tileX: 35, tileY: 5, direction: "down" },
  ],
  management: [
    { tileX: 10, tileY: 10, direction: "down" },
    { tileX: 20, tileY: 10, direction: "down" },
  ],
  alpha: [
    { tileX: 5, tileY: 18, direction: "right" },
    { tileX: 5, tileY: 20, direction: "right" },
    { tileX: 5, tileY: 22, direction: "right" },
    { tileX: 5, tileY: 24, direction: "right" },
    { tileX: 5, tileY: 26, direction: "right" },
    { tileX: 5, tileY: 28, direction: "right" },
    { tileX: 5, tileY: 30, direction: "right" },
  ],
  beta: [
    { tileX: 20, tileY: 18, direction: "right" },
    { tileX: 20, tileY: 20, direction: "right" },
    { tileX: 20, tileY: 22, direction: "right" },
    { tileX: 20, tileY: 24, direction: "right" },
    { tileX: 20, tileY: 26, direction: "right" },
    { tileX: 20, tileY: 28, direction: "right" },
    { tileX: 20, tileY: 30, direction: "right" },
  ],
  gamma: [
    { tileX: 35, tileY: 18, direction: "left" },
    { tileX: 35, tileY: 20, direction: "left" },
    { tileX: 35, tileY: 22, direction: "left" },
    { tileX: 35, tileY: 24, direction: "left" },
    { tileX: 35, tileY: 26, direction: "left" },
    { tileX: 35, tileY: 28, direction: "left" },
    { tileX: 35, tileY: 30, direction: "left" },
  ],
  delta: [
    { tileX: 50, tileY: 18, direction: "left" },
    { tileX: 50, tileY: 20, direction: "left" },
    { tileX: 50, tileY: 22, direction: "left" },
    { tileX: 50, tileY: 24, direction: "left" },
    { tileX: 50, tileY: 26, direction: "left" },
    { tileX: 50, tileY: 28, direction: "left" },
    { tileX: 50, tileY: 30, direction: "left" },
  ],
  epsilon: [
    { tileX: 65, tileY: 18, direction: "left" },
    { tileX: 65, tileY: 20, direction: "left" },
    { tileX: 65, tileY: 22, direction: "left" },
    { tileX: 65, tileY: 24, direction: "left" },
    { tileX: 65, tileY: 26, direction: "left" },
    { tileX: 65, tileY: 28, direction: "left" },
    { tileX: 65, tileY: 30, direction: "left" },
  ],
  zeta: [
    { tileX: 58, tileY: 36, direction: "right" },
    { tileX: 58, tileY: 38, direction: "right" },
    { tileX: 58, tileY: 40, direction: "right" },
    { tileX: 62, tileY: 36, direction: "right" },
    { tileX: 62, tileY: 38, direction: "right" },
    { tileX: 62, tileY: 40, direction: "right" },
    { tileX: 74, tileY: 37, direction: "down" },
  ],
};

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  /** Initialize all agents from the predefined personas. */
  initialize(): void {
    const teamDeskIdx: Record<string, number> = {};

    for (const [agentId, persona] of Object.entries(PERSONAS)) {
      const role = AGENT_ROLES[agentId];
      const teamId = AGENT_TEAMS[agentId];
      if (!role || !teamId) continue;

      const definition: AgentDefinition = {
        id: agentId,
        role,
        persona,
        teamId,
      };

      const agent = new Agent(definition);

      // Assign desk position
      const desks = DESK_POSITIONS[teamId];
      if (desks) {
        const idx = teamDeskIdx[teamId] ?? 0;
        if (idx < desks.length) {
          agent.assignDesk(desks[idx]);
          teamDeskIdx[teamId] = idx + 1;
        }
      }

      this.agents.set(agentId, agent);
    }
  }

  /** Get an agent by ID. */
  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /** Get all agents. */
  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  /** Get agents by role. */
  getByRole(role: AgentRole): Agent[] {
    return this.getAll().filter((a) => a.role === role);
  }

  /** Get agents by team ID. */
  getByTeam(teamId: string): Agent[] {
    return this.getAll().filter((a) => a.teamId === teamId);
  }

  /** Get the total agent count. */
  get count(): number {
    return this.agents.size;
  }

  /** Produce AgentDefinition[] for serialisation. */
  toDefinitions(): AgentDefinition[] {
    return this.getAll().map((a) => a.toDefinition());
  }
}
