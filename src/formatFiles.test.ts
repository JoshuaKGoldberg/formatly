import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { formatFiles } from "./formatFiles.js";

const mockReadFile = vi.fn();

vi.mock("node:fs/promises", () => ({
	get readFile() {
		return mockReadFile;
	},
}));

const mockSelectFormatter = vi.fn();

vi.mock("./selectFormatter.js", () => ({
	get selectFormatter() {
		return mockSelectFormatter;
	},
}));

const cwd = path.resolve("project");
const filePaths = ["a.ts", "b.ts"];
const absolutePaths = filePaths.map((filePath) => path.join(cwd, filePath));

function createMockFormatter() {
	return {
		checker: vi.fn(),
		name: "biome",
		runner: vi.fn(),
	};
}

describe(formatFiles, () => {
	it("resolves with a report error when no file paths are provided", async () => {
		const report = await formatFiles([]);

		expect(report).toEqual({
			message: "No file paths were provided to format.",
			ran: false,
		});
		expect(mockSelectFormatter).not.toHaveBeenCalled();
	});

	it("resolves with a report error when a formatter cannot be found", async () => {
		mockSelectFormatter.mockResolvedValueOnce(undefined);

		const report = await formatFiles(filePaths, { cwd });

		expect(report).toEqual({
			message: "Could not detect a formatter.",
			ran: false,
		});
	});

	it("resolves with the checker's result when check is true", async () => {
		const formatter = createMockFormatter();
		formatter.checker.mockResolvedValueOnce({ changed: [absolutePaths[1]] });
		mockSelectFormatter.mockResolvedValueOnce(formatter);

		const report = await formatFiles(filePaths, { check: true, cwd });

		expect(report).toEqual({
			changed: [absolutePaths[1]],
			formatter,
			ran: true,
		});
		expect(formatter.checker).toHaveBeenCalledWith({
			cwd,
			filePaths: absolutePaths,
		});
		expect(formatter.runner).not.toHaveBeenCalled();
	});

	it("resolves with the files whose contents changed after running the formatter", async () => {
		const formatter = createMockFormatter();
		formatter.runner.mockResolvedValueOnce({
			code: 0,
			runner: "child_process",
			signal: null,
		});
		mockSelectFormatter.mockResolvedValueOnce(formatter);
		mockReadFile
			.mockResolvedValueOnce("a")
			.mockResolvedValueOnce("b   ")
			.mockResolvedValueOnce("a")
			.mockResolvedValueOnce("b");

		const report = await formatFiles(filePaths, { cwd });

		expect(report).toEqual({
			changed: [absolutePaths[1]],
			formatter,
			ran: true,
		});
		expect(formatter.runner).toHaveBeenCalledWith({
			cwd,
			patterns: absolutePaths,
		});
	});

	it("resolves with an error when the formatter process fails", async () => {
		const formatter = createMockFormatter();
		formatter.runner.mockResolvedValueOnce({
			code: 2,
			runner: "child_process",
			signal: null,
		});
		mockSelectFormatter.mockResolvedValueOnce(formatter);
		mockReadFile.mockResolvedValue("");

		const report = await formatFiles(filePaths, { cwd });

		expect(report).toEqual({
			error: new Error("biome exited with code 2."),
			formatter,
			ran: true,
		});
	});

	it("resolves with an error when the formatter fails in memory", async () => {
		const formatter = createMockFormatter();
		formatter.runner.mockResolvedValueOnce({ code: 2, runner: "virtual" });
		mockSelectFormatter.mockResolvedValueOnce(formatter);
		mockReadFile.mockResolvedValue("");

		const report = await formatFiles(filePaths, { cwd });

		expect(report).toEqual({
			error: new Error("biome exited with code 2."),
			formatter,
			ran: true,
		});
	});

	it("resolves with the error when the formatter can't be spawned", async () => {
		const error = new Error("spawn deno ENOENT");
		const formatter = createMockFormatter();
		formatter.runner.mockRejectedValueOnce(error);
		mockSelectFormatter.mockResolvedValueOnce(formatter);
		mockReadFile.mockResolvedValue("");

		const report = await formatFiles(filePaths, { cwd });

		expect(report).toEqual({ error, formatter, ran: true });
	});
});
