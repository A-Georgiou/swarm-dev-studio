// ============================================================
// Message Types — inter-agent communication
// ============================================================

/** The kind of channel agents communicate through. */
export enum ChannelType {
  Direct = "direct",
  Team = "team",
  Broadcast = "broadcast",
  Escalation = "escalation",
}

/** Classification for individual messages. */
export enum MessageType {
  Chat = "chat",
  TaskAssign = "task_assign",
  CodeReview = "code_review",
  Decision = "decision",
  Artifact = "artifact",
}

/** A reference linking one message to another entity. */
export interface MessageReference {
  type: "message" | "artifact" | "task" | "file" | "decision";
  id: string;
  summary?: string;
}

/** A single message sent by an agent within a channel. */
export interface AgentMessage {
  id: string;
  timestamp: number;
  channelId: string;
  senderId: string;
  type: MessageType;
  content: string;
  references: MessageReference[];
  threadId?: string;
}

/** A communication channel (direct, team, broadcast, or escalation). */
export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  memberIds: string[];
}
