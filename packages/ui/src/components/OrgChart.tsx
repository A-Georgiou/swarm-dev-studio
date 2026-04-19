import React, { useEffect, useState } from "react";

interface OrgNode {
  id: string;
  name: string;
  role: string;
  state: string;
  teamId: string;
  model?: string;
}

interface OrgData {
  orgChart: {
    ceo: string;
    cto: string;
    staffManagers: string[];
    seniorManagers: string[];
    teams: Array<{ id: string; name: string; managerId: string; members: string[] }>;
  };
}

interface Props {
  onSelectAgent: (agentId: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  ceo: "#ffec27",
  cto: "#29adff",
  staff_manager: "#ffa300",
  senior_manager: "#00e436",
  manager: "#29adff",
  pm: "#ff77a8",
  senior_developer: "#00e436",
  developer: "#c2c3c7",
  qa: "#ffa300",
  tester: "#ff004d",
};

const STATE_ICONS: Record<string, string> = {
  idle: "⏸",
  thinking: "💭",
  coding: "⌨️",
  discussing: "💬",
  reviewing: "🔍",
  walking: "🚶",
  meeting: "📋",
};

export const OrgChart: React.FC<Props> = ({ onSelectAgent }) => {
  const [agents, setAgents] = useState<Map<string, OrgNode>>(new Map());
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["executive", "management"]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, orgRes] = await Promise.all([
          fetch("/api/agents"),
          fetch("/api/org"),
        ]);
        const agentsData = await agentsRes.json();
        const orgDataRes = await orgRes.json();

        const map = new Map<string, OrgNode>();
        for (const a of agentsData.agents) {
          map.set(a.id, a);
        }
        setAgents(map);
        setOrgData(orgDataRes);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderAgent = (id: string, indent: number) => {
    const agent = agents.get(id);
    if (!agent) return null;
    const color = ROLE_COLORS[agent.role] ?? "#c2c3c7";
    const icon = STATE_ICONS[agent.state] ?? "";

    return (
      <div
        key={id}
        style={{ ...styles.agentRow, paddingLeft: `${8 + indent * 12}px` }}
        onClick={() => onSelectAgent(id)}
        title={`${agent.name} — ${agent.role} [${agent.state}]`}
      >
        <span style={{ ...styles.agentName, color }}>{agent.name}</span>
        <span style={styles.stateIcon}>{icon}</span>
      </div>
    );
  };

  const renderTeam = (team: { id: string; name: string; managerId: string; members: string[] }) => {
    const isExpanded = expanded.has(team.id);
    const teamLabel = team.name || team.id.toUpperCase();

    return (
      <div key={team.id} style={styles.teamBlock}>
        <div
          style={styles.teamHeader}
          onClick={() => toggleExpand(team.id)}
        >
          <span>{isExpanded ? "▼" : "▶"}</span>
          <span style={styles.teamName}>🏢 {teamLabel}</span>
          <span style={styles.memberCount}>{team.members.length}</span>
        </div>
        {isExpanded && (
          <div>
            {team.members.map((m) => renderAgent(m, 2))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={styles.container}><span style={styles.loading}>Loading org...</span></div>;
  }

  if (!orgData) {
    return <div style={styles.container}><span style={styles.loading}>No org data</span></div>;
  }

  const { orgChart } = orgData;

  return (
    <div style={styles.container}>
      <div style={styles.header}>🏛 Organization</div>
      <div style={styles.scrollArea}>
        {/* Executive */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleExpand("executive")}>
            <span>{expanded.has("executive") ? "▼" : "▶"}</span>
            <span style={styles.sectionTitle}>Executive</span>
          </div>
          {expanded.has("executive") && (
            <>
              {renderAgent(orgChart.ceo, 1)}
              {renderAgent(orgChart.cto, 1)}
              {orgChart.staffManagers.map((id) => renderAgent(id, 1))}
            </>
          )}
        </div>

        {/* Management */}
        <div style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleExpand("management")}>
            <span>{expanded.has("management") ? "▼" : "▶"}</span>
            <span style={styles.sectionTitle}>Management</span>
          </div>
          {expanded.has("management") && orgChart.seniorManagers.map((id) => renderAgent(id, 1))}
        </div>

        {/* Teams */}
        {orgChart.teams.map((team) => renderTeam(team))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: "1px solid #30363d",
    maxHeight: "300px",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "8px 12px",
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: "bold",
    color: "#ffec27",
    backgroundColor: "#1d2b53",
    borderBottom: "1px solid #30363d",
  },
  scrollArea: {
    overflowY: "auto",
    flex: 1,
    padding: "4px 0",
  },
  loading: {
    color: "#8b949e",
    fontSize: "11px",
    fontFamily: "monospace",
    padding: "12px",
  },
  section: {
    marginBottom: "2px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    cursor: "pointer",
    color: "#8b949e",
    fontSize: "10px",
    fontFamily: "monospace",
    userSelect: "none",
  },
  sectionTitle: {
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  teamBlock: {
    marginBottom: "1px",
  },
  teamHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    cursor: "pointer",
    color: "#8b949e",
    fontSize: "10px",
    fontFamily: "monospace",
    userSelect: "none",
  },
  teamName: {
    flex: 1,
    fontWeight: "bold",
  },
  memberCount: {
    color: "#5f574f",
    fontSize: "9px",
  },
  agentRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: "10px",
    fontFamily: "monospace",
    transition: "background-color 0.1s",
  },
  agentName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  stateIcon: {
    fontSize: "9px",
  },
};
