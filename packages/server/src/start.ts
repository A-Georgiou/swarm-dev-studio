#!/usr/bin/env node
// ============================================================
// @swarm/server — standalone start script
// ============================================================

import { SwarmServer } from "./SwarmServer.js";

const server = new SwarmServer({
  port: parseInt(process.env.PORT ?? "3001", 10),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
});

await server.start();
server.startSimulation();

// Graceful shutdown
process.on("SIGINT", () => {
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
