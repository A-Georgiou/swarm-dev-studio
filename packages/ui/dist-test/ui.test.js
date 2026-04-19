import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const uiRoot = join(__dirname, "..");
describe("UI build output", () => {
    it("should have dist/index.html", () => {
        assert.ok(existsSync(join(uiRoot, "dist", "index.html")));
    });
    it("should have dist/assets directory with JS bundle", () => {
        const distAssets = join(uiRoot, "dist", "assets");
        assert.ok(existsSync(distAssets));
    });
    it("should reference the JS bundle in index.html", () => {
        const html = readFileSync(join(uiRoot, "dist", "index.html"), "utf-8");
        assert.ok(html.includes("<script"), "index.html should include a script tag");
        assert.ok(html.includes('type="module"'), "script should be type=module");
    });
});
describe("UI public assets", () => {
    it("should have manifest.json", () => {
        assert.ok(existsSync(join(uiRoot, "public", "assets", "manifest.json")));
    });
    it("should have office tilemap", () => {
        assert.ok(existsSync(join(uiRoot, "public", "assets", "maps", "office-map.json")));
    });
    it("should have office tileset", () => {
        assert.ok(existsSync(join(uiRoot, "public", "assets", "tiles", "office-tileset.png")));
    });
    it("should have character sprites for all roles", () => {
        const roles = ["ceo", "cto", "senior-manager", "team-manager", "pm", "senior-dev", "developer", "qa-engineer", "tester"];
        for (const role of roles) {
            assert.ok(existsSync(join(uiRoot, "public", "assets", "sprites", `${role}.png`)), `Missing sprite: ${role}.png`);
            assert.ok(existsSync(join(uiRoot, "public", "assets", "sprites", `${role}.json`)), `Missing atlas: ${role}.json`);
        }
    });
    it("should have UI assets", () => {
        assert.ok(existsSync(join(uiRoot, "public", "assets", "ui", "speech-bubble.png")));
        assert.ok(existsSync(join(uiRoot, "public", "assets", "ui", "thought-bubble.png")));
        assert.ok(existsSync(join(uiRoot, "public", "assets", "ui", "status-icons.png")));
    });
    it("manifest should list character sprites", () => {
        const manifest = JSON.parse(readFileSync(join(uiRoot, "public", "assets", "manifest.json"), "utf-8"));
        assert.ok(manifest.assets, "manifest should have assets");
        assert.ok(manifest.assets.sprites, "manifest should have sprites section");
        assert.ok(manifest.assets.sprites.characters.length >= 9, "should have at least 9 character types");
    });
});
describe("UI React components", () => {
    const srcDir = join(uiRoot, "src");
    it("should have all required component files", () => {
        const components = [
            "App.tsx",
            "components/PhaserGame.tsx",
            "components/TaskPanel.tsx",
            "components/ActivityLog.tsx",
            "components/ConnectionIndicator.tsx",
            "components/OrgChart.tsx",
            "components/AgentDetailPanel.tsx",
        ];
        for (const comp of components) {
            assert.ok(existsSync(join(srcDir, comp)), `Missing component: ${comp}`);
        }
    });
    it("should have all game engine files", () => {
        const gameFiles = [
            "game/config.ts",
            "game/GameStateManager.ts",
            "game/scenes/BootScene.ts",
            "game/scenes/OfficeScene.ts",
            "game/scenes/UIScene.ts",
            "game/entities/Character.ts",
            "game/controllers/MovementController.ts",
            "game/ui/SpeechBubble.ts",
        ];
        for (const file of gameFiles) {
            assert.ok(existsSync(join(srcDir, file)), `Missing game file: ${file}`);
        }
    });
    it("should have network client", () => {
        assert.ok(existsSync(join(srcDir, "network", "SwarmClient.ts")));
    });
});
