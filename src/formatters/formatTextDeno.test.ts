import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { formatTextDeno } from "./formatTextDeno.js";

const mockAccess = vi.fn();

vi.mock("node:fs/promises", () => ({
	get access() {
		return mockAccess;
	},
}));

const mockRunFormatterTextCommand = vi.fn();

vi.mock("./runFormatterCommand.js", () => ({
	get runFormatterTextCommand() {
		return mockRunFormatterTextCommand;
	},
}));

const options = {
	cwd: path.resolve("project"),
	filePath: path.resolve("project", "index.ts"),
	text: "const a   =  1",
};

const formatted = { formatted: "const a = 1;\n" };

function getCommandArgs() {
	return mockRunFormatterTextCommand.mock.calls.map(([command]) =>
		(command as { args: (filePath: string) => string[] }).args(
			options.filePath,
		),
	);
}

function mockCheckError(stderr: string) {
	mockAccess.mockResolvedValueOnce(undefined);
	mockRunFormatterTextCommand.mockImplementation(
		async ({ args }: { args: (filePath: string) => string[] }) =>
			await Promise.resolve(
				args(options.filePath).includes("--check")
					? { error: new Error(`deno exited with code 1.\n${stderr}`) }
					: formatted,
			),
	);
}

describe("formatTextDeno", () => {
	it("formats stdin without checking exclusion when the file doesn't exist", async () => {
		mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
		mockRunFormatterTextCommand.mockResolvedValueOnce(formatted);

		const result = await formatTextDeno(options);

		expect(result).toBe(formatted);
		expect(getCommandArgs()).toEqual([["fmt", "--ext", "ts", "-"]]);
	});

	it("omits --ext when the file path has no extension", async () => {
		mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
		mockRunFormatterTextCommand.mockResolvedValueOnce(formatted);

		await formatTextDeno({ ...options, filePath: "Dockerfile" });

		expect(getCommandArgs()).toEqual([["fmt", "-"]]);
	});

	it("returns the stdin result when Deno doesn't exclude the file", async () => {
		mockCheckError("error: Found 1 not formatted file in 1 file");

		const result = await formatTextDeno(options);

		expect(result).toBe(formatted);
		expect(getCommandArgs()).toEqual(
			expect.arrayContaining([["fmt", "--check", options.filePath]]),
		);
	});

	it("returns the text unchanged when Deno excludes the file", async () => {
		mockCheckError("error: No target files found.");

		const result = await formatTextDeno(options);

		expect(result).toEqual({ formatted: options.text });
	});
});
