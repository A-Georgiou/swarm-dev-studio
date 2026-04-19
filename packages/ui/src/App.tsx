import React, { useState, useEffect, useCallback, useRef } from "react";
import { PhaserGame } from "./components/PhaserGame";
import { TaskPanel } from "./components/TaskPanel";
import { ActivityLog } from "./components/ActivityLog";
import { ConnectionIndicator } from "./components/ConnectionIndicator";
import { swarmClient, type ConnectionStatus } from "./network/SwarmClient";
import { gameStateManager } from "./game/GameStateManager";

export const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    swarmClient.onStatusChange(setConnectionStatus);
    swarmClient.connect();

    const speechHandler = (event: { agentId: string; text: string }) => {
      setMessages((prev) => [
        ...prev.slice(-99),
        {
          sender: event.agentId,
          text: event.text,
          time: new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    };

    const selectHandler = (data: { agentId: string }) => {
      setSelectedAgent(data.agentId);
    };

    const deselectHandler = () => {
      setSelectedAgent(null);
    };

    gameStateManager.on("agent-speech", speechHandler);
    gameStateManager.on("character-selected", selectHandler);
    gameStateManager.on("character-deselected", deselectHandler);

    return () => {
      swarmClient.disconnect();
      gameStateManager.off("agent-speech", speechHandler);
      gameStateManager.off("character-selected", selectHandler);
      gameStateManager.off("character-deselected", deselectHandler);
    };
  }, []);

  const handleSubmitTask = useCallback((title: string, description: string) => {
    if (connectionStatus !== "connected") {
      // Fallback: POST to REST API
      fetch("http://localhost:3001/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      }).catch(console.error);
      return;
    }
    swarmClient.submitTask(`${title}: ${description}`);
  }, [connectionStatus]);

  return (
    <div style={styles.container}>
      <div style={styles.gameArea}>
        <PhaserGame />
      </div>
      <div style={styles.sidebar}>
        <ConnectionIndicator status={connectionStatus} />
        {selectedAgent && (
          <div style={styles.selectedAgent}>
            <span style={styles.selectedLabel}>👤 Selected:</span>
            <span style={styles.selectedId}>{selectedAgent}</span>
          </div>
        )}
        <TaskPanel onSubmit={handleSubmitTask} />
        <ActivityLog messages={messages} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#0d1117",
  },
  gameArea: {
    flex: 1,
    position: "relative",
  },
  sidebar: {
    width: "320px",
    backgroundColor: "#161b22",
    borderLeft: "1px solid #30363d",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  selectedAgent: {
    padding: "8px 12px",
    backgroundColor: "#1d2b53",
    borderBottom: "1px solid #30363d",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  selectedLabel: {
    color: "#8b949e",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  selectedId: {
    color: "#ffec27",
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
};
