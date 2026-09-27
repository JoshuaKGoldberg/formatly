import { describe, expect, it, vi } from "vitest";

import { formatTextDprint } from "./formatTextDprint.js";

const mockExecFile = vi.fn();
const mockSpawn = vi.fn();

vi.mock("node:child_process", () => ({
	get execFile() {
		return mockExecFile;
	},
	get spawn() {
		return mockSpawn;
	},
}));

const mockRunPackageFormatterTextCommand = vi.fn();

vi.mock("./runFormatterCommand.js", () => ({
	resolvePackageCommand: (_: unknown, args: string[]) => ({
		args,
		command: "dprint",
	}),
	get runPackageFormatterTextCommand() {
		return mockRunPackageFormatterTextCommand;
	},
}));

const formatted = { formatted: "const a = 1;\n" };

describe("formatTextDprint", () => {
	it("formats with the stdin command when dprint editor-info fails", async () => {
		mockExecFile.mockImplementationOnce(
			(_command, _args, _options, callback: (error: Error) => void) => {
				callback(new Error("spawn dprint ENOENT"));
			},
		);
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(formatted);
		const options = { cwd: "failing", filePath: "index.ts", text: "" };

		const result = await formatTextDprint(options);

		expect(result).toBe(formatted);
		expect(mockSpawn).not.toHaveBeenCalled();
		expect(mockRunPackageFormatterTextCommand).toHaveBeenCalledWith(
			expect.objectContaining({ command: "dprint" }),
			options,
		);
	});

	it("formats with the stdin command when the editor service schema version is unsupported", async () => {
		mockExecFile.mockImplementationOnce(
			(
				_command,
				_args,
				_options,
				callback: (error: null, result: { stdout: string }) => void,
			) => {
				callback(null, { stdout: JSON.stringify({ schemaVersion: 4 }) });
			},
		);
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(formatted);

		const result = await formatTextDprint({
			cwd: "outdated",
			filePath: "index.ts",
			text: "",
		});

		expect(result).toBe(formatted);
		expect(mockSpawn).not.toHaveBeenCalled();
	});
});
