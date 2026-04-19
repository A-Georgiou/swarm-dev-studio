import React, { useState, useCallback } from "react";

interface TaskPanelProps {
  onSubmit: (title: string, description: string) => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !description.trim()) return;
      onSubmit(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    },
    [title, description, onSubmit],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>📝 Submit Task</div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
        />
        <textarea
          placeholder="Describe what you want the team to build..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
          rows={3}
        />
        <button type="submit" style={styles.button} disabled={!title.trim() || !description.trim()}>
          {submitted ? "✅ Submitted!" : "🚀 Send to CEO"}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: "1px solid #30363d",
    padding: "0",
  },
  header: {
    padding: "8px 12px",
    color: "#ffec27",
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: "bold",
    backgroundColor: "#0d1117",
    borderBottom: "1px solid #30363d",
  },
  form: {
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  input: {
    backgroundColor: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: "4px",
    padding: "6px 8px",
    color: "#c9d1d9",
    fontSize: "12px",
    fontFamily: "monospace",
    outline: "none",
  },
  textarea: {
    backgroundColor: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: "4px",
    padding: "6px 8px",
    color: "#c9d1d9",
    fontSize: "12px",
    fontFamily: "monospace",
    outline: "none",
    resize: "vertical" as const,
  },
  button: {
    backgroundColor: "#238636",
    border: "1px solid #2ea043",
    borderRadius: "4px",
    padding: "6px 12px",
    color: "#ffffff",
    fontSize: "12px",
    fontFamily: "monospace",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
