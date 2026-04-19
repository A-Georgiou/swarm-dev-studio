// ============================================================
// Server integration tests — Node.js built-in test runner
// ============================================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { SwarmServer } from "../SwarmServer.js";

describe("SwarmServer", () => {
  let server: SwarmServer;
  const port = 9876;

  before(async () => {
    server = new SwarmServer({ port, host: "127.0.0.1" });
    await server.start();
  });

  after(() => {
    server.stop();
  });

  it("should respond to health check", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json() as { status: string };
    assert.equal(data.status, "ok");
  });

  it("should return agents list", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents`);
    assert.equal(res.status, 200);
    const data = await res.json() as { agents: unknown[] };
    assert.ok(data.agents.length > 0);
  });

  it("should return org chart", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/org`);
    assert.equal(res.status, 200);
    const data = await res.json() as { orgChart: { ceo: string } };
    assert.equal(data.orgChart.ceo, "ceo-morgan");
  });

  it("should create a task", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Task", description: "A test task" }),
    });
    assert.equal(res.status, 201);
    const data = await res.json() as { task: { id: string; title: string } };
    assert.ok(data.task.id);
    assert.equal(data.task.title, "Test Task");
  });

  it("should return tasks list", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/tasks`);
    assert.equal(res.status, 200);
    const data = await res.json() as { tasks: unknown[] };
    assert.ok(data.tasks.length > 0);
  });

  it("should return game state", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/state`);
    assert.equal(res.status, 200);
    const data = await res.json() as { characters: unknown[] };
    assert.ok(data.characters.length > 0);
  });

  it("should handle game commands", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/game/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "pause" }),
    });
    assert.equal(res.status, 200);
    const data = await res.json() as { success: boolean };
    assert.ok(data.success);
  });

  it("should handle CORS", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      method: "OPTIONS",
    });
    assert.equal(res.status, 204);
  });

  it("should return 404 for unknown routes", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/nonexistent`);
    assert.equal(res.status, 404);
  });
});
