import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "../game/config";

/**
 * React component that owns the Phaser 3 game instance.
 * Mounts the canvas into a container div and destroys the game on unmount.
 */
export const PhaserGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createGameConfig(containerRef.current);
    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
};
