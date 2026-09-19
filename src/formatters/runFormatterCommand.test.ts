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

	it("runs non-package-manager commands directly", async () => {
		await runFormatterCommand({ args: ["fmt"], command: "deno" }, options);

		expect(mockDetect).not.toHaveBeenCalled();
		expect(mockSpawn).toHaveBeenCalledWith(
			"deno",
			["fmt", ...options.patterns],
			{ cwd: options.cwd },
		);
	});
});
