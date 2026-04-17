import type { GameState } from "./game.js";
import type { AgentMessage } from "./message.js";
import type { Task } from "./task.js";
import type { AgentState } from "./agent.js";
export interface WsGameStateEvent {
    event: "game:state";
    payload: GameState;
}
export interface WsAgentMessageEvent {
    event: "agent:message";
    payload: AgentMessage;
}
export interface WsAgentStateChangeEvent {
    event: "agent:stateChange";
    payload: {
        agentId: string;
        previousState: AgentState;
        newState: AgentState;
    };
}
export interface WsTaskUpdateEvent {
    event: "task:update";
    payload: Task;
}
export interface WsErrorEvent {
    event: "error";
    payload: {
        code: string;
        message: string;
    };
}
/** Union of all server-to-client WebSocket events. */
export type ServerWsEvent = WsGameStateEvent | WsAgentMessageEvent | WsAgentStateChangeEvent | WsTaskUpdateEvent | WsErrorEvent;
export interface WsSubscribeEvent {
    event: "subscribe";
    payload: {
        channels: string[];
    };
}
export interface WsUnsubscribeEvent {
    event: "unsubscribe";
    payload: {
        channels: string[];
    };
}
export interface WsSendMessageEvent {
    event: "send:message";
    payload: {
        channelId: string;
        content: string;
    };
}
export interface WsRequestStateEvent {
    event: "request:state";
    payload: Record<string, never>;
}
/** Union of all client-to-server WebSocket events. */
export type ClientWsEvent = WsSubscribeEvent | WsUnsubscribeEvent | WsSendMessageEvent | WsRequestStateEvent;
/** GET /api/agents — list all agents */
export interface GetAgentsResponse {
    agents: Array<{
        id: string;
        role: string;
        name: string;
        state: AgentState;
        teamId: string;
    }>;
}
/** GET /api/tasks — list tasks with optional filters */
export interface GetTasksRequest {
    status?: string;
    assignedTo?: string;
    level?: string;
}
export interface GetTasksResponse {
    tasks: Task[];
}
/** POST /api/tasks — create a new top-level task */
export interface CreateTaskRequest {
    title: string;
    description: string;
}
export interface CreateTaskResponse {
    task: Task;
}
/** GET /api/messages/:channelId — fetch channel messages */
export interface GetMessagesRequest {
    channelId: string;
    limit?: number;
    before?: string;
}
export interface GetMessagesResponse {
    messages: AgentMessage[];
    hasMore: boolean;
}
/** GET /api/org — retrieve organisation chart */
export interface GetOrgChartResponse {
    orgChart: import("./org.js").OrgChart;
}
/** POST /api/game/command — send a game command */
export interface GameCommandRequest {
    command: "pause" | "resume" | "speed" | "reset";
    params?: Record<string, unknown>;
}
export interface GameCommandResponse {
    success: boolean;
    message?: string;
}
//# sourceMappingURL=api.d.ts.map