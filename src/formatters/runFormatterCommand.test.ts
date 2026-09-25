import { describe, expect, it, vi } from "vitest";

import {
	runFormatterCommand,
	runPackageFormatterCommand,
} from "./runFormatterCommand.js";

const mockSpawn = vi.fn(() => ({
	on: (
		name: string,
		callback: (code: null | number, signal: NodeJS.Signals | null) => void,
	) => {
		if (name === "exit") {
			callback(0, null);
		}
	},
}));

vi.mock("node:child_process", () => ({
	get spawn() {
		return mockSpawn;
	},
}));

const mockDetect = vi.fn();

vi.mock("package-manager-detector", () => ({
	get detect() {
		return mockDetect;
	},
}));

const mockResolveCommand = vi.hoisted(() => vi.fn());

vi.mock("package-manager-detector/commands", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("package-manager-detector/commands")>();

	mockResolveCommand.mockImplementation(actual.resolveCommand);

	return {
		get resolveCommand() {
			return mockResolveCommand;
		},
	};
});

const options = {
	cwd: "project",
	patterns: ["src/**/*.ts"],
};

describe("runFormatterCommand", () => {
	it("uses the detected package manager to execute local packages", async () => {
		mockDetect.mockResolvedValueOnce({
			agent: "pnpm",
			name: "pnpm",
		});

		await runPackageFormatterCommand(
			{ args: ["fmt"], command: "dprint" },
			options,
		);

		expect(mockDetect).toHaveBeenCalledWith({ cwd: options.cwd });
		expect(mockSpawn).toHaveBeenCalledWith(
			"pnpm",
			["exec", "dprint", "fmt", ...options.patterns],
			{ cwd: options.cwd },
		);
	});

	it("falls back to npx when a package manager cannot be detected", async () => {
		mockDetect.mockResolvedValueOnce(null);

		await runPackageFormatterCommand(
			{ args: ["fmt"], command: "dprint" },
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			"npx",
			["dprint", "fmt", ...options.patterns],
			{ cwd: options.cwd },
		);
	});

	it("falls back to npx when the package manager has no local execute command", async () => {
		mockDetect.mockResolvedValueOnce({
			agent: "pnpm",
			name: "pnpm",
		});
		mockResolveCommand.mockReturnValueOnce(null);

		await runPackageFormatterCommand(
			{ args: ["fmt"], command: "dprint" },
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			"npx",
			["dprint", "fmt", ...options.patterns],
			{ cwd: options.cwd },
		);
	});

	it.each([
		{
			agent: "bun",
			args: ["x", "@biomejs/biome", "format", "--write"],
			command: "bun",
		},
		{
			agent: "deno",
			args: ["task", "--eval", "biome", "format", "--write"],
			command: "deno",
		},
		{
			agent: "npm",
			args: ["@biomejs/biome", "format", "--write"],
			command: "npx",
		},
		{
			agent: "pnpm",
			args: ["exec", "biome", "format", "--write"],
			command: "pnpm",
		},
		{
			agent: "yarn",
			args: ["exec", "biome", "--", "format", "--write"],
			command: "yarn",
		},
		{
			agent: "yarn@berry",
			args: ["exec", "biome", "format", "--write"],
			command: "yarn",
		},
	])(
		"executes a package named differently than its bin with $agent",
		async ({ agent, args, command }) => {
			mockDetect.mockResolvedValueOnce({ agent, name: agent.split("@")[0] });

			await runPackageFormatterCommand(
				{
					args: ["format", "--write"],
					command: "biome",
					packageName: "@biomejs/biome",
				},
				options,
			);

			expect(mockSpawn).toHaveBeenCalledWith(
				command,
				[...args, ...options.patterns],
				{ cwd: options.cwd },
			);
		},
	);

	it("falls back to npx with the package name when the package manager has no local execute command", async () => {
		mockDetect.mockResolvedValueOnce({
			agent: "pnpm",
			name: "pnpm",
		});
		mockResolveCommand.mockReturnValueOnce(null);

		await runPackageFormatterCommand(
			{
				args: ["format", "--write"],
				command: "biome",
				packageName: "@biomejs/biome",
			},
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			"npx",
			["@biomejs/biome", "format", "--write", ...options.patterns],
			{ cwd: options.cwd },
		);
	});

	it("runs non-package-manager commands directly", async () => {
		await runFormatterCommand({ args: ["fmt"], command: "deno" }, options);

		expect(mockDetect).not.toHaveBeenCalled();
		expect(mockSpawn).toHaveBeenCalledWith(
			"deno",
			["fmt", ...options.patterns],
			{ cwd: options.cwd },
		);
	});

	it("resolves the package command without spawning it when dryRun is true", async () => {
		mockDetect.mockResolvedValueOnce({
			agent: "pnpm",
			name: "pnpm",
		});

		const result = await runPackageFormatterCommand(
			{ args: ["fmt"], command: "dprint" },
			{ ...options, dryRun: true },
		);

		expect(result).toEqual({
			args: ["exec", "dprint", "fmt", ...options.patterns],
			command: "pnpm",
			runner: "dry-run",
		});
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it("resolves the direct command without spawning it when dryRun is true", async () => {
		const result = await runFormatterCommand(
			{ args: ["fmt"], command: "deno" },
			{ ...options, dryRun: true },
		);

		expect(result).toEqual({
			args: ["fmt", ...options.patterns],
			command: "deno",
			runner: "dry-run",
		});
		expect(mockSpawn).not.toHaveBeenCalled();
	});
});
