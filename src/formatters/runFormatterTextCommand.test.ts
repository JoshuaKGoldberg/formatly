import { EventEmitter } from "node:events";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { formatters } from "./all.js";
import {
	runFormatterTextCommand,
	runPackageFormatterTextCommand,
} from "./runFormatterCommand.js";

interface MockChildOptions {
	code?: null | number;
	error?: Error;
	signal?: NodeJS.Signals | null;
	stderr?: string;
	stdinError?: Error;
	stdout?: string;
}

function createMockChild({
	code = 0,
	error,
	signal = null,
	stderr = "",
	stdinError,
	stdout = "",
}: MockChildOptions) {
	const child = Object.assign(new EventEmitter(), {
		stderr: new EventEmitter(),
		stdin: Object.assign(new EventEmitter(), { end: vi.fn() }),
		stdout: new EventEmitter(),
	});

	child.stdin.end.mockImplementation(() => {
		if (error) {
			child.emit("error", error);
			return;
		}

		if (stdinError) {
			child.stdin.emit("error", stdinError);
		}

		child.stdout.emit("data", Buffer.from(stdout));
		child.stderr.emit("data", Buffer.from(stderr));
		child.emit("close", code, signal);
	});

	return child;
}

const mockSpawn = vi.fn();

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

const options = {
	cwd: "project",
	filePath: path.resolve("project", "src", "index.ts"),
	text: "const a   =  1",
};

const formatted = "const a = 1;\n";

describe("runFormatterTextCommand", () => {
	it("pipes the text through the command and resolves with its output", async () => {
		const child = createMockChild({ stdout: formatted });
		mockSpawn.mockReturnValueOnce(child);

		const result = await runFormatterTextCommand(
			{ args: (filePath) => ["fmt", filePath], command: "deno" },
			options,
		);

		expect(result).toEqual({ formatted });
		expect(mockDetect).not.toHaveBeenCalled();
		expect(mockSpawn).toHaveBeenCalledWith("deno", ["fmt", options.filePath], {
			cwd: options.cwd,
			stdio: "pipe",
		});
		expect(child.stdin.end).toHaveBeenCalledWith(options.text);
	});

	it("resolves with an error including stderr when the command exits with a non-zero code", async () => {
		mockSpawn.mockReturnValueOnce(
			createMockChild({ code: 2, stderr: "[error] SyntaxError\n" }),
		);

		const result = await runFormatterTextCommand(
			{ args: () => ["fmt"], command: "deno" },
			options,
		);

		expect(result).toEqual({
			error: new Error("deno exited with code 2.\n[error] SyntaxError"),
		});
	});

	it("resolves with an error when the command is terminated by a signal", async () => {
		mockSpawn.mockReturnValueOnce(
			createMockChild({ code: null, signal: "SIGTERM" }),
		);

		const result = await runFormatterTextCommand(
			{ args: () => ["fmt"], command: "deno" },
			options,
		);

		expect(result).toEqual({
			error: new Error("deno was terminated by signal SIGTERM."),
		});
	});

	it("resolves with the exit error when the command closes stdin before reading it", async () => {
		mockSpawn.mockReturnValueOnce(
			createMockChild({
				code: 1,
				stderr: "Unknown --ext value\n",
				stdinError: new Error("write EPIPE"),
			}),
		);

		const result = await runFormatterTextCommand(
			{ args: () => ["fmt"], command: "deno" },
			options,
		);

		expect(result).toEqual({
			error: new Error("deno exited with code 1.\nUnknown --ext value"),
		});
	});

	it("resolves with the error when the command cannot be spawned", async () => {
		const error = new Error("spawn deno ENOENT");
		mockSpawn.mockReturnValueOnce(createMockChild({ error }));

		const result = await runFormatterTextCommand(
			{ args: () => ["fmt"], command: "deno" },
			options,
		);

		expect(result).toEqual({ error });
	});
});

describe("runPackageFormatterTextCommand", () => {
	it("uses the detected package manager to execute local packages", async () => {
		mockDetect.mockResolvedValueOnce({ agent: "pnpm", name: "pnpm" });
		mockSpawn.mockReturnValueOnce(createMockChild({ stdout: formatted }));

		const result = await runPackageFormatterTextCommand(
			{ args: (filePath) => ["fmt", "--stdin", filePath], command: "dprint" },
			options,
		);

		expect(result).toEqual({ formatted });
		expect(mockDetect).toHaveBeenCalledWith({ cwd: options.cwd });
		expect(mockSpawn).toHaveBeenCalledWith(
			"pnpm",
			["exec", "dprint", "fmt", "--stdin", options.filePath],
			{ cwd: options.cwd, stdio: "pipe" },
		);
	});

	it("falls back to npx when a package manager cannot be detected", async () => {
		mockDetect.mockResolvedValueOnce(null);
		mockSpawn.mockReturnValueOnce(createMockChild({ stdout: formatted }));

		await runPackageFormatterTextCommand(
			{ args: (filePath) => ["fmt", "--stdin", filePath], command: "dprint" },
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			"npx",
			["dprint", "fmt", "--stdin", options.filePath],
			{ cwd: options.cwd, stdio: "pipe" },
		);
	});

	it("executes the bin name when the package manager executes bins", async () => {
		mockDetect.mockResolvedValueOnce({ agent: "pnpm", name: "pnpm" });
		mockSpawn.mockReturnValueOnce(createMockChild({ stdout: formatted }));

		await runPackageFormatterTextCommand(
			{
				args: () => ["format"],
				command: "biome",
				packageName: "@biomejs/biome",
			},
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			"pnpm",
			["exec", "biome", "format"],
			{
				cwd: options.cwd,
				stdio: "pipe",
			},
		);
	});

	it("executes the package name when the package manager executes packages", async () => {
		mockDetect.mockResolvedValueOnce({ agent: "npm", name: "npm" });
		mockSpawn.mockReturnValueOnce(createMockChild({ stdout: formatted }));

		await runPackageFormatterTextCommand(
			{
				args: () => ["format"],
				command: "biome",
				packageName: "@biomejs/biome",
			},
			options,
		);

		expect(mockSpawn).toHaveBeenCalledWith(
			"npx",
			["@biomejs/biome", "format"],
			{
				cwd: options.cwd,
				stdio: "pipe",
			},
		);
	});
});

describe("formatters formatText commands", () => {
	const [biome, deno, dprint, oxfmt] = formatters;

	it.each([
		{
			args: [
				"@biomejs/biome",
				"format",
				`--stdin-file-path=${options.filePath}`,
			],
			command: "npx",
			formatter: biome,
		},
		{
			args: ["fmt", "--ext", "ts", "-"],
			command: "deno",
			formatter: deno,
		},
		{
			args: ["dprint", "fmt", "--stdin", options.filePath],
			command: "npx",
			formatter: dprint,
		},
		{
			args: ["oxfmt", "--stdin-filepath", options.filePath],
			command: "npx",
			formatter: oxfmt,
		},
	])(
		"$formatter.name spawns $command with stdin arguments",
		async ({ args, command, formatter }) => {
			mockDetect.mockResolvedValueOnce(null);
			mockSpawn.mockReturnValueOnce(createMockChild({ stdout: formatted }));

			const result = await formatter.formatText(options);

			expect(result).toEqual({ formatted });
			expect(mockSpawn).toHaveBeenCalledWith(command, args, {
				cwd: options.cwd,
				stdio: "pipe",
			});
		},
	);

	it("deno omits --ext when the file path has no extension", async () => {
		mockSpawn.mockReturnValueOnce(createMockChild({ stdout: formatted }));

		await deno.formatText({ ...options, filePath: "Dockerfile" });

		expect(mockSpawn).toHaveBeenCalledWith("deno", ["fmt", "-"], {
			cwd: options.cwd,
			stdio: "pipe",
		});
	});
});
