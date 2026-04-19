// ============================================================
// OrgManager — organisational hierarchy and team management
// ============================================================

import { AgentRole, type OrgChart, type Team } from "@swarm/types";
import type { AgentManager } from "../agents/AgentManager.js";

/** Reporting chain definition: who reports to whom. */
const REPORTING_CHAIN: Record<string, string> = {
  // CTO reports to CEO
  "cto-aria": "ceo-morgan",
  // Staff managers report to CTO
  "staff-mgr-jordan": "cto-aria",
  "staff-mgr-casey": "cto-aria",
  // Senior managers report to staff managers
  "sr-mgr-alex": "staff-mgr-jordan",
  "sr-mgr-sam": "staff-mgr-jordan",
  // Team managers report to senior managers
  "alpha-mgr-priya": "sr-mgr-alex",
  "beta-mgr-devon": "sr-mgr-alex",
  "gamma-mgr-iris": "sr-mgr-sam",
  "delta-mgr-chen": "sr-mgr-sam",
  "epsilon-mgr-nora": "sr-mgr-sam",
  // Team members report to their team manager
  "alpha-pm-liam": "alpha-mgr-priya",
  "alpha-sr-dev-mika": "alpha-mgr-priya",
  "alpha-dev-zara": "alpha-mgr-priya",
  "alpha-dev-kai": "alpha-mgr-priya",
  "alpha-qa-nina": "alpha-mgr-priya",
  "alpha-tester-omar": "alpha-mgr-priya",
  "beta-pm-elena": "beta-mgr-devon",
  "beta-sr-dev-ravi": "beta-mgr-devon",
  "beta-dev-felix": "beta-mgr-devon",
  "beta-dev-luna": "beta-mgr-devon",
  "beta-qa-tasha": "beta-mgr-devon",
  "beta-tester-jin": "beta-mgr-devon",
  "gamma-pm-derek": "gamma-mgr-iris",
  "gamma-sr-dev-yuki": "gamma-mgr-iris",
  "gamma-dev-alex2": "gamma-mgr-iris",
  "gamma-dev-sofia": "gamma-mgr-iris",
  "gamma-qa-marco": "gamma-mgr-iris",
  "gamma-tester-aisha": "gamma-mgr-iris",
  "delta-pm-rachel": "delta-mgr-chen",
  "delta-sr-dev-omar2": "delta-mgr-chen",
  "delta-dev-sarah": "delta-mgr-chen",
  "delta-dev-mike": "delta-mgr-chen",
  "delta-qa-ling": "delta-mgr-chen",
  "delta-tester-ben": "delta-mgr-chen",
  "epsilon-pm-james": "epsilon-mgr-nora",
  "epsilon-sr-dev-tariq": "epsilon-mgr-nora",
  "epsilon-dev-hana": "epsilon-mgr-nora",
  "epsilon-dev-rio": "epsilon-mgr-nora",
  "epsilon-qa-vera": "epsilon-mgr-nora",
  "epsilon-tester-max": "epsilon-mgr-nora",
  // Team Zeta reports to sr-mgr-sam
  "zeta-mgr-diana": "sr-mgr-sam",
  "zeta-pm-rohan": "zeta-mgr-diana",
  "zeta-sr-dev-elena2": "zeta-mgr-diana",
  "zeta-dev-kofi": "zeta-mgr-diana",
  "zeta-dev-mei": "zeta-mgr-diana",
  "zeta-qa-sven": "zeta-mgr-diana",
  "zeta-tester-fatima": "zeta-mgr-diana",
};

export class OrgManager {
  private _reportingChain: Record<string, string> = { ...REPORTING_CHAIN };
  private _teams: Team[] = [];
  private _orgChart: OrgChart | null = null;

  /** Build the full org chart from the agent manager. */
  initialize(agentManager: AgentManager): void {
    const teamIds = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
    this._teams = teamIds.map((teamId) => {
      const teamAgents = agentManager.getByTeam(teamId);
      const manager = teamAgents.find(
        (a) => a.role === AgentRole.Manager
      );
      return {
        id: teamId,
        name: `Team ${teamId.charAt(0).toUpperCase() + teamId.slice(1)}`,
        managerId: manager?.id ?? "",
        members: teamAgents.map((a) => a.id),
      };
    });

    this._orgChart = {
      ceo: "ceo-morgan",
      cto: "cto-aria",
      staffManagers: ["staff-mgr-jordan", "staff-mgr-casey"],
      seniorManagers: ["sr-mgr-alex", "sr-mgr-sam"],
      teams: this._teams,
    };
  }

  /** Get who a given agent reports to. */
  getManager(agentId: string): string | null {
    return this._reportingChain[agentId] ?? null;
  }

  /** Get direct reports for a given agent. */
  getDirectReports(managerId: string): string[] {
    return Object.entries(this._reportingChain)
      .filter(([, mgr]) => mgr === managerId)
      .map(([id]) => id);
  }

  /** Get the full chain of command from an agent up to CEO. */
  getChainOfCommand(agentId: string): string[] {
    const chain: string[] = [];
    let current = agentId;
    while (this._reportingChain[current]) {
      current = this._reportingChain[current];
      chain.push(current);
    }
    return chain;
  }

  /** Get a team by ID. */
  getTeam(teamId: string): Team | undefined {
    return this._teams.find((t) => t.id === teamId);
  }

  /** Get all teams. */
  getAllTeams(): Team[] {
    return [...this._teams];
  }

  /** Get the org chart snapshot. */
  getOrgChart(): OrgChart {
    if (!this._orgChart) {
      throw new Error("OrgManager not initialized");
    }
    return this._orgChart;
  }

  /** Find the best team to assign a task to based on keywords. */
  suggestTeam(keywords: string[]): string {
    const teamKeywords: Record<string, string[]> = {
      alpha: ["frontend", "ui", "ux", "design", "react", "css", "component", "page", "view"],
      beta: ["backend", "api", "server", "database", "rest", "graphql", "endpoint"],
      gamma: ["data", "infrastructure", "pipeline", "analytics", "ml", "scale", "performance"],
      delta: ["test", "qa", "quality", "coverage", "e2e"],
      epsilon: ["devops", "deploy", "ci", "cd", "docker", "kubernetes", "monitoring", "platform"],
      zeta: ["security", "auth", "vulnerability", "pentest", "encryption", "compliance", "oauth", "login"],
    };

    const scores: Record<string, number> = {};
    for (const [teamId, teamKws] of Object.entries(teamKeywords)) {
      scores[teamId] = 0;
      for (const kw of keywords) {
        if (teamKws.some((tk) => kw.toLowerCase().includes(tk))) {
          scores[teamId]++;
        }
      }
    }

    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] ?? "alpha";
  }
}
