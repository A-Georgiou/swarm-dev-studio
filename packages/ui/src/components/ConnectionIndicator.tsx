import React from "react";
import type { ConnectionStatus } from "../network/SwarmClient";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; icon: string }> = {
  connected: { color: "#2ea043", label: "Connected", icon: "🟢" },
  connecting: { color: "#d29922", label: "Connecting...", icon: "🟡" },
  disconnected: { color: "#6e7681", label: "Disconnected", icon: "⚪" },
  error: { color: "#f85149", label: "Error", icon: "🔴" },
};

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <div style={styles.container}>
      <span>{config.icon}</span>
      <span style={{ ...styles.label, color: config.color }}>{config.label}</span>
      <span style={styles.server}>Server: localhost:3001</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    borderBottom: "1px solid #30363d",
    backgroundColor: "#0d1117",
  },
  label: {
    fontSize: "11px",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  server: {
    color: "#484f58",
    fontSize: "10px",
    fontFamily: "monospace",
    marginLeft: "auto",
  },
};
