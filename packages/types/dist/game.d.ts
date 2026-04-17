import type { AgentState } from "./agent.js";
/** A single animation sequence for a character sprite. */
export interface SpriteAnimation {
    name: string;
    frames: number[];
    frameRate: number;
    loop: boolean;
}
/** Visual representation of an agent in the office. */
export interface CharacterSprite {
    agentId: string;
    spriteSheet: string;
    animations: Record<AgentState, SpriteAnimation>;
    position: {
        x: number;
        y: number;
    };
    direction: "up" | "down" | "left" | "right";
    currentAnimation: AgentState;
}
/** A speech bubble shown above a character. */
export interface SpeechBubble {
    agentId: string;
    text: string;
    duration: number;
    style: "normal" | "thinking" | "exclaim";
}
/** A room inside the office tilemap. */
export interface OfficeRoom {
    id: string;
    name: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    type: "office" | "meeting_room" | "open_space" | "break_room" | "server_room";
}
/** The full tilemap describing the office layout. */
export interface OfficeTilemap {
    width: number;
    height: number;
    tileSize: number;
    layers: TilemapLayer[];
    rooms: OfficeRoom[];
}
/** A single layer within the office tilemap. */
export interface TilemapLayer {
    name: string;
    data: number[];
    visible: boolean;
}
/** Snapshot of the full game state sent to the UI. */
export interface GameState {
    tick: number;
    timestamp: number;
    characters: CharacterSprite[];
    speechBubbles: SpeechBubble[];
    tilemap: OfficeTilemap;
}
//# sourceMappingURL=game.d.ts.map