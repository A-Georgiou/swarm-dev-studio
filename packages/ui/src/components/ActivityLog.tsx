import React, { useRef, useEffect } from "react";

interface Message {
  sender: string;
  text: string;
  time: string;
}

interface ActivityLogProps {
  messages: Message[];
}

const ROLE_COLORS: Record<string, string> = {
  ceo: "#ffec27",
  cto: "#29adff",
  "staff-mgr": "#ffa300",
  "sr-mgr": "#00e436",
  mgr: "#29adff",
  pm: "#ff77a8",
  "sr-dev": "#00e436",
  dev: "#c2c3c7",
  qa: "#ffa300",
  tester: "#ff004d",
};

function getSenderColor(sender: string): string {
  for (const [key, color] of Object.entries(ROLE_COLORS)) {
    if (sender.includes(key)) return color;
  }
  return "#c2c3c7";
}

function getShortName(sender: string): string {
  const parts = sender.split("-");
  return parts[parts.length - 1];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>💬 Activity Log ({messages.length})</div>
      <div ref={scrollRef} style={styles.scrollArea}>
        {messages.length === 0 && (
          <div style={styles.empty}>No activity yet. Submit a task to get started!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={styles.message}>
            <span style={styles.time}>{msg.time}</span>
            <span style={{ ...styles.sender, color: getSenderColor(msg.sender) }}>
              {getShortName(msg.sender)}
            </span>
            <span style={styles.text}>{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "8px 12px",
    color: "#ffec27",
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: "bold",
    backgroundColor: "#0d1117",
    borderBottom: "1px solid #30363d",
    flexShrink: 0,
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 8px",
  },
  empty: {
    color: "#484f58",
    fontSize: "11px",
    fontFamily: "monospace",
    padding: "12px 4px",
    textAlign: "center",
  },
  message: {
    display: "flex",
    gap: "6px",
    padding: "2px 4px",
    borderBottom: "1px solid #21262d",
    alignItems: "baseline",
    fontSize: "11px",
    fontFamily: "monospace",
  },
  time: {
    color: "#484f58",
    fontSize: "10px",
    flexShrink: 0,
  },
  sender: {
    fontWeight: "bold",
    fontSize: "11px",
    flexShrink: 0,
  },
  text: {
    color: "#c9d1d9",
    fontSize: "11px",
    wordBreak: "break-word",
  },
};
