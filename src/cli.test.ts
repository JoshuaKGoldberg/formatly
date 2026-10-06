// cspell:ignore dryrun
import { createRequire } from "node:module";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { cli } from "./cli.js";

const { version } = createRequire(import.meta.url)("../package.json") as {
	version: string;
};

const mockFormatly = vi.fn();

vi.mock("./formatly.js", () => ({
	get formatly() {
		return mockFormatly;
	},
}));

const mockError = vi.fn();
const mockLog = vi.fn();

const patterns = ["*"];

describe("cli", () => {
	beforeEach(() => {
		console.error = mockError;
		console.log = mockLog;
	});

	it.each([
		{ args: ["--help"] },
		{ args: ["-h"] },
		{ args: ["src", "--help"] },
	])(
		"returns 0 and logs usage without formatting when given $args",
		async ({ args }) => {
			const result = await cli(args);

			expect(result).toBe(0);
			expect(mockFormatly).not.toHaveBeenCalled();
			expect(mockLog).toHaveBeenCalledWith(
				expect.stringContaining("Usage: formatly"),
			);
		},
	);

	it("logs help with usage, description, and options", async () => {
		const result = await cli(["--help"]);

		expect(result).toBe(0);
		expect(mockLog.mock.calls).toMatchInlineSnapshot(`
			[
			  [
			    "Usage: formatly [options] <patterns...>

			Formats files with whatever formatter your project is already using.

			Options:
			      --dry-run  Report the detected formatter and command without formatting
			  -h, --help     Show this help message
			  -v, --version  Show the version number",
			  ],
			]
		`);
		expect(mockError).not.toHaveBeenCalled();
	});

	it.each([{ args: ["--version"] }, { args: ["-v"] }])(
		"returns 0 and logs the version without formatting when given $args",
		async ({ args }) => {
			const result = await cli(args);

			expect(result).toBe(0);
			expect(mockFormatly).not.toHaveBeenCalled();
			expect(mockLog).toHaveBeenCalledWith(version);
		},
	);

	it("returns 0 and logs the formatter name when formatly runs", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: { code: 0, runner: "child_process", signal: null },
		});

		const result = await cli(patterns);

		expect(result).toBe(0);
		expect(mockFormatly).toHaveBeenCalledWith(patterns, { dryRun: false });
		expect(mockLog).toHaveBeenCalledWith("Formatted with prettier. 🧼");
		expect(mockError).not.toHaveBeenCalled();
	});

	it("returns the exit code and logs an error when the formatter process exits with a non-zero code", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "biome" },
			ran: true,
			result: { code: 2, runner: "child_process", signal: null },
		});

		const result = await cli(patterns);

		expect(result).toBe(2);
		expect(mockError).toHaveBeenCalledWith(
			"Failed formatting with biome (exit code 2). 🛑",
		);
		expect(mockLog).not.toHaveBeenCalled();
	});

	it("returns 1 and logs an error when the formatter process is killed by a signal", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "biome" },
			ran: true,
			result: { code: null, runner: "child_process", signal: "SIGTERM" },
		});

		const result = await cli(patterns);

		expect(result).toBe(1);
		expect(mockError).toHaveBeenCalledWith(
			"Failed formatting with biome (signal SIGTERM). 🛑",
		);
		expect(mockLog).not.toHaveBeenCalled();
	});

	it("returns the exit code and logs an error when the formatter fails virtually", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: { code: 2, runner: "virtual" },
		});

		const result = await cli(patterns);

		expect(result).toBe(2);
		expect(mockError).toHaveBeenCalledWith(
			"Failed formatting with prettier (exit code 2). 🛑",
		);
		expect(mockLog).not.toHaveBeenCalled();
	});

	it("returns 0 and logs the formatter name when formatly runs virtually", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: { code: 0, runner: "virtual" },
		});

		const result = await cli(patterns);

		expect(result).toBe(0);
		expect(mockLog).toHaveBeenCalledWith("Formatted with prettier. 🧼");
		expect(mockError).not.toHaveBeenCalled();
	});

	it("returns 0 and logs the formatter and command without formatting when --dry-run is passed", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: {
				args: ["exec", "prettier", "--write", ...patterns],
				command: "pnpm",
				runner: "dry-run",
			},
		});

		const result = await cli(["--dry-run", ...patterns]);

		expect(result).toBe(0);
		expect(mockFormatly).toHaveBeenCalledWith(patterns, { dryRun: true });
		expect(mockLog.mock.calls).toEqual([
			["Detected prettier. 🔍"],
			["Would run: pnpm exec prettier --write *"],
		]);
		expect(mockError).not.toHaveBeenCalled();
	});

	it.each([
		{ args: ["--dry-run=false", ...patterns], dryRun: false },
		{ args: ["--no-dry-run", ...patterns], dryRun: false },
		{ args: [...patterns, "--dry-run"], dryRun: true },
	])(
		"passes dryRun: $dryRun to formatly when given $args",
		async ({ args, dryRun }) => {
			mockFormatly.mockResolvedValueOnce({
				formatter: { name: "prettier" },
				ran: true,
				result: { code: 0, runner: "virtual" },
			});

			const result = await cli(args);

			expect(result).toBe(0);
			expect(mockFormatly).toHaveBeenCalledWith(patterns, { dryRun });
		},
	);

	it("passes all positionals to formatly as patterns", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: { code: 0, runner: "virtual" },
		});

		const result = await cli(["src", "*.md"]);

		expect(result).toBe(0);
		expect(mockFormatly).toHaveBeenCalledWith(["src", "*.md"], {
			dryRun: false,
		});
	});

	it.each([
		{ args: ["--"], dryRun: false, patterns: ["--"] },
		{ args: ["--", "-weird"], dryRun: false, patterns: ["--", "-weird"] },
		{
			args: ["src", "--dry-run", "--", "-weird", "--help"],
			dryRun: true,
			patterns: ["src", "--", "-weird", "--help"],
		},
		{
			args: ["src", "--", "a", "--", "b"],
			dryRun: false,
			patterns: ["src", "--", "a", "--", "b"],
		},
		{ args: ["src", "--"], dryRun: false, patterns: ["src", "--"] },
	])(
		"passes $patterns to formatly when given $args",
		async ({ args, dryRun, patterns }) => {
			mockFormatly.mockResolvedValueOnce({
				formatter: { name: "prettier" },
				ran: true,
				result: { code: 0, runner: "virtual" },
			});

			const result = await cli(args);

			expect(result).toBe(0);
			expect(mockFormatly).toHaveBeenCalledWith(patterns, { dryRun });
		},
	);

	it("passes no patterns to formatly when none are given", async () => {
		const message = "No file patterns were provided to formatly.";
		mockFormatly.mockResolvedValueOnce({ message, ran: false });

		const result = await cli([]);

		expect(result).toBe(1);
		expect(mockFormatly).toHaveBeenCalledWith([], { dryRun: false });
		expect(mockError).toHaveBeenCalledWith(message);
	});

	it.each([
		{
			args: ["--foo", ...patterns],
			text: "Unknown flag: --foo\nRun 'formatly --help' for usage.",
		},
		{
			args: ["--dryrun", ...patterns],
			text: "Unknown flag: --dryrun (did you mean --dry-run?)\nRun 'formatly --help' for usage.",
		},
		{
			args: ["-x", ...patterns],
			text: "Unknown flag: -x\nRun 'formatly --help' for usage.",
		},
		{
			args: ["--dry-run=yes", ...patterns],
			text: "--dry-run does not take a value.\nRun 'formatly --help' for usage.",
		},
	])(
		"returns 1 and logs an error without formatting when given $args",
		async ({ args, text }) => {
			const result = await cli(args);

			expect(result).toBe(1);
			expect(mockFormatly).not.toHaveBeenCalled();
			expect(mockError).toHaveBeenCalledWith(text);
			expect(mockLog).not.toHaveBeenCalled();
		},
	);

	it("returns 0 and logs usage when given --help alongside an unknown flag", async () => {
		const result = await cli(["--foo", "--help"]);

		expect(result).toBe(0);
		expect(mockFormatly).not.toHaveBeenCalled();
		expect(mockError).not.toHaveBeenCalled();
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Usage: formatly"),
		);
	});

	it("returns 1 and logs an error when formatly does not run", async () => {
		const message = "Oh no!";
		mockFormatly.mockResolvedValueOnce({ message, ran: false });

		const result = await cli(patterns);

		expect(result).toBe(1);
		expect(mockError).toHaveBeenCalledWith(message);
		expect(mockLog).not.toHaveBeenCalled();
	});

	it("returns 1 and logs an error when formatly throws", async () => {
		mockFormatly.mockRejectedValueOnce(new Error("spawn deno ENOENT"));

		const result = await cli(patterns);

		expect(result).toBe(1);
		expect(mockError).toHaveBeenCalledWith(
			"Failed running formatly: Error: spawn deno ENOENT 🛑",
		);
		expect(mockLog).not.toHaveBeenCalled();
	});
});
