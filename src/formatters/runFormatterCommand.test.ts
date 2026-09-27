import path from "node:path";
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

const mockAccess = vi.fn().mockRejectedValue(new Error("ENOENT"));

vi.mock("node:fs/promises", () => ({
	get access() {
		return mockAccess;
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
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
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
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
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
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
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
				{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
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
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
		);
	});

	it("spawns the bin from node_modules/.bin when it is installed", async () => {
		mockAccess.mockResolvedValueOnce(undefined);

		await runPackageFormatterCommand(
			{ args: ["fmt"], command: "dprint" },
			options,
		);

		expect(mockDetect).not.toHaveBeenCalled();
		expect(mockSpawn).toHaveBeenCalledWith(
			path.resolve(options.cwd, "node_modules", ".bin", "dprint"),
			["fmt", ...options.patterns],
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
		);
	});

	it("spawns the bin from a parent directory's node_modules/.bin", async () => {
		mockAccess
			.mockRejectedValueOnce(new Error("ENOENT"))
			.mockResolvedValueOnce(undefined);

		await runPackageFormatterCommand(
			{ args: ["fmt"], command: "dprint" },
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			path.resolve("node_modules", ".bin", "dprint"),
			["fmt", ...options.patterns],
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
		);
	});

	it("uses the package manager without looking in node_modules/.bin on Windows", async () => {
		const { platform } = process;
		Object.defineProperty(process, "platform", { value: "win32" });
		mockDetect.mockResolvedValueOnce({ agent: "pnpm", name: "pnpm" });

		try {
			await runPackageFormatterCommand(
				{ args: ["fmt"], command: "dprint" },
				options,
			);
		} finally {
			Object.defineProperty(process, "platform", { value: platform });
		}

		expect(mockAccess).not.toHaveBeenCalled();
		expect(mockSpawn).toHaveBeenCalledWith(
			"pnpm",
			["exec", "dprint", "fmt", ...options.patterns],
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
		);
	});

	it("runs non-package-manager commands directly", async () => {
		await runFormatterCommand({ args: ["fmt"], command: "deno" }, options);

		expect(mockDetect).not.toHaveBeenCalled();
		expect(mockSpawn).toHaveBeenCalledWith(
			"deno",
			["fmt", ...options.patterns],
			{ cwd: options.cwd, stdio: ["ignore", "ignore", "inherit"] },
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
