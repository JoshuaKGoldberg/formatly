import { describe, expect, it, vi } from "vitest";

import { spawnCommand } from "./spawnCommand.js";

const mockSpawn = vi.fn();

vi.mock("node:child_process", () => ({
	get spawn() {
		return mockSpawn;
	},
}));

const mockNormalizeSpawnCommand = vi.fn();

vi.mock("tinyexec", () => ({
	get normalizeSpawnCommand() {
		return mockNormalizeSpawnCommand;
	},
}));

describe("spawnCommand", () => {
	it("spawns the command as normalized for the platform", () => {
		const child = {};
		const normalized = {
			args: ["/d", "/s", "/c", '"npx ^"oxfmt^""'],
			command: "cmd.exe",
			options: { cwd: "project", windowsVerbatimArguments: true },
		};
		mockNormalizeSpawnCommand.mockReturnValueOnce(normalized);
		mockSpawn.mockReturnValueOnce(child);

		const result = spawnCommand("npx", ["oxfmt"], { cwd: "project" });

		expect(result).toBe(child);
		expect(mockNormalizeSpawnCommand).toHaveBeenCalledWith("npx", ["oxfmt"], {
			cwd: "project",
		});
		expect(mockSpawn).toHaveBeenCalledWith(
			normalized.command,
			normalized.args,
			normalized.options,
		);
	});
});
