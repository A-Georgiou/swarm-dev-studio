import React, { useEffect, useState } from "react";

interface AgentDetail {
  id: string;
  role: string;
  name: string;
  title: string;
  state: string;
  teamId: string;
  model: string;
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  communicationStyle: string;
  catchphrases: string[];
  currentTaskId: string | null;
}

interface Props {
  agentId: string;
  onClose: () => void;
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

const STATE_LABELS: Record<string, { icon: string; label: string }> = {
  idle: { icon: "⏸", label: "Idle" },
  thinking: { icon: "💭", label: "Thinking" },
  coding: { icon: "⌨️", label: "Coding" },
  discussing: { icon: "💬", label: "Discussing" },
  reviewing: { icon: "🔍", label: "Reviewing" },
  walking: { icon: "🚶", label: "Walking" },
  meeting: { icon: "📋", label: "In Meeting" },
};

const TraitBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={styles.traitRow}>
    <span style={styles.traitLabel}>{label}</span>
    <div style={styles.traitBarOuter}>
      <div style={{ ...styles.traitBarInner, width: `${value * 100}%` }} />
    </div>
    <span style={styles.traitValue}>{(value * 100).toFixed(0)}%</span>
  </div>
);

export const AgentDetailPanel: React.FC<Props> = ({ agentId, onClose }) => {
  const [agent, setAgent] = useState<AgentDetail | null>(null);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        const found = data.agents.find((a: AgentDetail) => a.id === agentId);
        setAgent(found ?? null);
      } catch {
        setAgent(null);
      }
    };
    fetchAgent();
    const interval = setInterval(fetchAgent, 3000);
    return () => clearInterval(interval);
  }, [agentId]);

  if (!agent) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span>👤 Agent Detail</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  const roleColor = ROLE_COLORS[agent.role] ?? "#c2c3c7";
  const stateInfo = STATE_LABELS[agent.state] ?? { icon: "?", label: agent.state };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ color: roleColor }}>👤 {agent.name}</span>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={styles.scrollArea}>
        {/* Title & Role */}
        <div style={styles.infoBlock}>
          <div style={styles.title}>{agent.title}</div>
          <div style={styles.meta}>
            <span style={{ color: roleColor }}>{agent.role.replace(/_/g, " ").toUpperCase()}</span>
            <span style={styles.separator}>•</span>
            <span>Team {agent.teamId.toUpperCase()}</span>
          </div>
        </div>

        {/* Current State */}
        <div style={styles.stateBlock}>
          <span style={styles.stateIcon}>{stateInfo.icon}</span>
          <span style={styles.stateLabel}>{stateInfo.label}</span>
          {agent.currentTaskId && (
            <span style={styles.taskBadge}>📝 {agent.currentTaskId}</span>
          )}
        </div>

        {/* Model */}
        <div style={styles.infoBlock}>
          <div style={styles.sectionLabel}>🤖 AI Model</div>
          <div style={styles.modelBadge}>{agent.model}</div>
        </div>

        {/* Personality */}
        <div style={styles.infoBlock}>
          <div style={styles.sectionLabel}>🧠 Personality (Big Five)</div>
          <TraitBar label="OPN" value={agent.personality.openness} />
          <TraitBar label="CON" value={agent.personality.conscientiousness} />
          <TraitBar label="EXT" value={agent.personality.extraversion} />
          <TraitBar label="AGR" value={agent.personality.agreeableness} />
          <TraitBar label="NEU" value={agent.personality.neuroticism} />
        </div>

        {/* Communication Style */}
        <div style={styles.infoBlock}>
          <div style={styles.sectionLabel}>💬 Communication Style</div>
          <div style={styles.styleText}>{agent.communicationStyle}</div>
        </div>

        {/* Catchphrases */}
        <div style={styles.infoBlock}>
          <div style={styles.sectionLabel}>🗣 Catchphrases</div>
          {agent.catchphrases.map((phrase, i) => (
            <div key={i} style={styles.catchphrase}>"{phrase}"</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: "1px solid #30363d",
    display: "flex",
    flexDirection: "column",
    maxHeight: "400px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "#1d2b53",
    borderBottom: "1px solid #30363d",
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#8b949e",
    cursor: "pointer",
    fontSize: "12px",
    padding: "2px 4px",
  },
  scrollArea: {
    overflowY: "auto",
    flex: 1,
    padding: "8px 12px",
  },
  loading: {
    color: "#8b949e",
    fontSize: "11px",
    fontFamily: "monospace",
    padding: "12px",
  },
  infoBlock: {
    marginBottom: "10px",
  },
  title: {
    color: "#fff1e8",
    fontSize: "11px",
    fontFamily: "monospace",
    marginBottom: "2px",
  },
  meta: {
    color: "#8b949e",
    fontSize: "10px",
    fontFamily: "monospace",
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  separator: {
    color: "#30363d",
  },
  stateBlock: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 8px",
    backgroundColor: "#0d1117",
    borderRadius: "4px",
    marginBottom: "10px",
  },
  stateIcon: {
    fontSize: "14px",
  },
  stateLabel: {
    color: "#fff1e8",
    fontSize: "11px",
    fontFamily: "monospace",
    flex: 1,
  },
  taskBadge: {
    color: "#ffa300",
    fontSize: "9px",
    fontFamily: "monospace",
  },
  sectionLabel: {
    color: "#8b949e",
    fontSize: "9px",
    fontFamily: "monospace",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  modelBadge: {
    color: "#29adff",
    fontSize: "10px",
    fontFamily: "monospace",
    backgroundColor: "#0d1117",
    padding: "3px 8px",
    borderRadius: "3px",
    display: "inline-block",
  },
  traitRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginBottom: "2px",
  },
  traitLabel: {
    color: "#8b949e",
    fontSize: "8px",
    fontFamily: "monospace",
    width: "24px",
  },
  traitBarOuter: {
    flex: 1,
    height: "4px",
    backgroundColor: "#0d1117",
    borderRadius: "2px",
    overflow: "hidden",
  },
  traitBarInner: {
    height: "100%",
    backgroundColor: "#29adff",
    borderRadius: "2px",
    transition: "width 0.3s",
  },
  traitValue: {
    color: "#5f574f",
    fontSize: "8px",
    fontFamily: "monospace",
    width: "28px",
    textAlign: "right" as const,
  },
  styleText: {
    color: "#c2c3c7",
    fontSize: "10px",
    fontFamily: "monospace",
    lineHeight: "1.4",
  },
  catchphrase: {
    color: "#ffa300",
    fontSize: "10px",
    fontFamily: "monospace",
    fontStyle: "italic",
    marginBottom: "2px",
  },
};
