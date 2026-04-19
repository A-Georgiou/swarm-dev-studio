// ============================================================
// MessageBus — inter-agent communication system
// ============================================================

import {
  ChannelType,
  MessageType,
  type AgentMessage,
  type Channel,
  type MessageReference,
} from "@swarm/types";

let nextMsgId = 1;
function generateMessageId(): string {
  return `msg-${nextMsgId++}`;
}

let nextChannelId = 1;
function generateChannelId(): string {
  return `ch-${nextChannelId++}`;
}

export type MessageHandler = (message: AgentMessage) => void;

export class MessageBus {
  private channels: Map<string, Channel> = new Map();
  private messages: Map<string, AgentMessage[]> = new Map();
  private handlers: MessageHandler[] = [];

  /** Create a new communication channel. */
  createChannel(
    type: ChannelType,
    name: string,
    memberIds: string[]
  ): Channel {
    const channel: Channel = {
      id: generateChannelId(),
      type,
      name,
      memberIds,
    };
    this.channels.set(channel.id, channel);
    this.messages.set(channel.id, []);
    return channel;
  }

  /** Initialize default channels for teams and broadcast. */
  initializeDefaults(teamIds: string[], allAgentIds: string[]): void {
    // Broadcast channel
    this.createChannel(ChannelType.Broadcast, "all-hands", allAgentIds);

    // Executive channel
    const execIds = allAgentIds.filter(
      (id) =>
        id.startsWith("ceo") ||
        id.startsWith("cto") ||
        id.startsWith("staff-mgr")
    );
    this.createChannel(ChannelType.Team, "exec-chat", execIds);

    // Management channel
    const mgmtIds = allAgentIds.filter(
      (id) =>
        id.startsWith("sr-mgr") ||
        id.startsWith("staff-mgr") ||
        id.includes("-mgr-")
    );
    this.createChannel(ChannelType.Team, "management", mgmtIds);

    // Team channels
    for (const teamId of teamIds) {
      const teamAgentIds = allAgentIds.filter((id) =>
        id.startsWith(teamId + "-") || id.startsWith(teamId.slice(0, 5))
      );
      if (teamAgentIds.length > 0) {
        this.createChannel(ChannelType.Team, `team-${teamId}`, teamAgentIds);
      }
    }
  }

  /** Send a message on a channel. */
  send(
    channelId: string,
    senderId: string,
    type: MessageType,
    content: string,
    references: MessageReference[] = [],
    threadId?: string
  ): AgentMessage {
    const channel = this.channels.get(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not found`);

    const message: AgentMessage = {
      id: generateMessageId(),
      timestamp: Date.now(),
      channelId,
      senderId,
      type,
      content,
      references,
      threadId,
    };

    const msgs = this.messages.get(channelId);
    if (msgs) {
      msgs.push(message);
    }

    // Notify all handlers
    for (const handler of this.handlers) {
      handler(message);
    }

    return message;
  }

  /** Send a direct message between two agents. */
  sendDirect(
    senderId: string,
    recipientId: string,
    content: string,
    type: MessageType = MessageType.Chat
  ): AgentMessage {
    // Find or create direct channel
    let channel = this.findDirectChannel(senderId, recipientId);
    if (!channel) {
      channel = this.createChannel(
        ChannelType.Direct,
        `dm-${senderId}-${recipientId}`,
        [senderId, recipientId]
      );
    }
    return this.send(channel.id, senderId, type, content);
  }

  /** Register a handler for all messages. */
  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  /** Get messages for a channel. */
  getMessages(channelId: string, limit?: number): AgentMessage[] {
    const msgs = this.messages.get(channelId) ?? [];
    if (limit) {
      return msgs.slice(-limit);
    }
    return [...msgs];
  }

  /** Get all channels an agent is a member of. */
  getChannelsForAgent(agentId: string): Channel[] {
    return Array.from(this.channels.values()).filter((ch) =>
      ch.memberIds.includes(agentId)
    );
  }

  /** Get a channel by ID. */
  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /** Get all channels. */
  getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  /** Get recent messages across all channels. */
  getRecentMessages(limit: number = 50): AgentMessage[] {
    const all: AgentMessage[] = [];
    for (const msgs of this.messages.values()) {
      all.push(...msgs);
    }
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all.slice(0, limit);
  }

  /** Get the total message count. */
  get messageCount(): number {
    let total = 0;
    for (const msgs of this.messages.values()) {
      total += msgs.length;
    }
    return total;
  }

  // ── Private helpers ───────────────────────────────────────

  private findDirectChannel(
    agentA: string,
    agentB: string
  ): Channel | undefined {
    return Array.from(this.channels.values()).find(
      (ch) =>
        ch.type === ChannelType.Direct &&
        ch.memberIds.includes(agentA) &&
        ch.memberIds.includes(agentB)
    );
  }
}
