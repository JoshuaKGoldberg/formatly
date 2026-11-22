import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { formatTextDprint } from "./formatTextDprint.ts";

const mockSpawn = vi.fn();

vi.mock("node:child_process", () => ({
	get spawn() {
		return mockSpawn;
	},
}));

const mockRunPackageFormatterTextCommand = vi.fn();
const mockSpawnOutput = vi.fn();

vi.mock("./runFormatterCommand.ts", () => ({
	resolvePackageCommand: (_: unknown, args: string[]) => ({
		args,
		command: "dprint",
	}),
	get runPackageFormatterTextCommand() {
		return mockRunPackageFormatterTextCommand;
	},
	get spawnOutput() {
		return mockSpawnOutput;
	},
}));

const formatted = { formatted: "const a = 1;\n" };

function createMockEditorService() {
	const handles = { ref: vi.fn(), unref: vi.fn() };

	return Object.assign(new EventEmitter(), handles, {
		stdin: Object.assign(new EventEmitter(), handles, { write: vi.fn() }),
		stdout: Object.assign(new EventEmitter(), handles),
	});
}

function encodeMessage(id: number, kind: number, body: number[]) {
	const buffer = Buffer.alloc(12 + body.length * 4 + 4, 255);

	buffer.writeUInt32BE(id, 0);
	buffer.writeUInt32BE(kind, 4);
	buffer.writeUInt32BE(body.length * 4, 8);
	body.forEach((value, index) => buffer.writeUInt32BE(value, 12 + index * 4));

	return buffer;
}

function mockEditorInfo(schemaVersion: number) {
	mockSpawnOutput.mockResolvedValueOnce({
		code: 0,
		signal: null,
		stderr: "",
		stdout: JSON.stringify({ schemaVersion }),
	});
}

describe(formatTextDprint, () => {
	it("formats with the stdin command when dprint editor-info fails", async () => {
		mockSpawnOutput.mockResolvedValueOnce({
			error: new Error("spawn dprint ENOENT"),
		});
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(formatted);
		const options = { cwd: "failing", filePath: "index.ts", text: "" };

		const result = await formatTextDprint(options);

		expect(result).toBe(formatted);
		expect(mockSpawnOutput).toHaveBeenCalledWith(
			{ args: ["editor-info"], command: "dprint" },
			options.cwd,
		);
		expect(mockSpawn).not.toHaveBeenCalled();
		expect(mockRunPackageFormatterTextCommand).toHaveBeenCalledWith(
			expect.objectContaining({ command: "dprint" }),
			options,
		);
	});

	it("formats with the stdin command when dprint editor-info exits with an error code", async () => {
		mockSpawnOutput.mockResolvedValueOnce({
			code: 1,
			signal: null,
			stderr: "",
			stdout: JSON.stringify({ schemaVersion: 5 }),
		});
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(formatted);

		const result = await formatTextDprint({
			cwd: "erroring",
			filePath: "index.ts",
			text: "",
		});

		expect(result).toBe(formatted);
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it("formats with the stdin command when dprint editor-info prints invalid JSON", async () => {
		mockSpawnOutput.mockResolvedValueOnce({
			code: 0,
			signal: null,
			stderr: "",
			stdout: "not json",
		});
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(formatted);

		const result = await formatTextDprint({
			cwd: "invalid",
			filePath: "index.ts",
			text: "",
		});

		expect(result).toBe(formatted);
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it("formats with the stdin command when the editor service schema version is unsupported", async () => {
		mockEditorInfo(4);
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(formatted);

		const result = await formatTextDprint({
			cwd: "outdated",
			filePath: "index.ts",
			text: "",
		});

		expect(result).toBe(formatted);
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it("resolves pending requests with an error when the editor service exits", async () => {
		const child = createMockEditorService();
		mockEditorInfo(5);
		mockSpawn.mockReturnValueOnce(child);

		const result = formatTextDprint({
			cwd: "exiting",
			filePath: "index.ts",
			text: "",
		});

		await vi.waitFor(() => {
			expect(child.stdin.write).toHaveBeenCalled();
		});

		const unrelated = Buffer.concat([
			encodeMessage(0, 0, [1]),
			encodeMessage(1, 7, [99, 0]),
		]);
		child.stdout.emit("data", unrelated.subarray(0, 35));
		child.stdout.emit("data", unrelated.subarray(35));
		child.stdin.emit("error", new Error("EPIPE"));
		child.emit("exit", 1);

		expect(await result).toEqual({
			error: new Error("dprint editor-service exited with code 1."),
		});
	});
});
