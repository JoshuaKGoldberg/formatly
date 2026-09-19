import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { formatTextPrettier } from "./formatTextPrettier.js";

const mockRequire = vi.fn();

vi.mock("node:module", () => ({
	createRequire: () => mockRequire,
}));

const mockRunPackageFormatterTextCommand = vi.fn();

vi.mock("./runFormatterCommand.js", () => ({
	get runPackageFormatterTextCommand() {
		return mockRunPackageFormatterTextCommand;
	},
}));

const options = {
	cwd: path.resolve("project"),
	filePath: path.resolve("project", "index.ts"),
	text: "const a   =  1",
};

function createMockPrettier(
	fileInfo: { ignored: boolean; inferredParser: null | string } = {
		ignored: false,
		inferredParser: "typescript",
	},
) {
	return {
		format: vi.fn().mockResolvedValue("const a = 1;\n"),
		getFileInfo: vi.fn().mockResolvedValue(fileInfo),
		resolveConfig: vi.fn().mockResolvedValue({ semi: false }),
	};
}

describe("formatTextPrettier", () => {
	it("formats with the command when requiring prettier fails", async () => {
		const result = { formatted: "const a = 1;\n" };
		mockRequire.mockImplementation(() => {
			throw new Error("Module not found");
		});
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce(result);

		const actual = await formatTextPrettier(options);

		expect(actual).toBe(result);
		expect(mockRequire).toHaveBeenCalledWith("prettier");

		const [command, passedOptions] = mockRunPackageFormatterTextCommand.mock
			.calls[0] as [
			{ args: (filePath: string) => string[]; command: string },
			unknown,
		];

		expect(command.command).toBe("prettier");
		expect(command.args(options.filePath)).toEqual([
			"--stdin-filepath",
			options.filePath,
		]);
		expect(passedOptions).toBe(options);
	});

	it("formats with the resolved config when requiring prettier succeeds", async () => {
		const mockPrettier = createMockPrettier();
		mockRequire.mockReturnValueOnce(mockPrettier);

		const actual = await formatTextPrettier(options);

		expect(actual).toEqual({ formatted: "const a = 1;\n" });
		expect(mockRunPackageFormatterTextCommand).not.toHaveBeenCalled();
		expect(mockPrettier.getFileInfo).toHaveBeenCalledWith(options.filePath, {
			ignorePath: [
				path.join(options.cwd, ".prettierignore"),
				path.join(options.cwd, ".gitignore"),
			],
			resolveConfig: true,
		});
		expect(mockPrettier.resolveConfig).toHaveBeenCalledWith(options.filePath, {
			editorconfig: true,
		});
		expect(mockPrettier.format).toHaveBeenCalledWith(options.text, {
			filepath: options.filePath,
			semi: false,
		});
	});

	it("resolves with the text unchanged when the file is ignored", async () => {
		const mockPrettier = createMockPrettier({
			ignored: true,
			inferredParser: "typescript",
		});
		mockRequire.mockReturnValueOnce(mockPrettier);

		const actual = await formatTextPrettier(options);

		expect(actual).toEqual({ formatted: options.text });
		expect(mockPrettier.format).not.toHaveBeenCalled();
	});

	it("resolves with an error when no parser can be inferred", async () => {
		const mockPrettier = createMockPrettier({
			ignored: false,
			inferredParser: null,
		});
		mockRequire.mockReturnValueOnce(mockPrettier);

		const actual = await formatTextPrettier(options);

		expect(actual).toEqual({
			error: new Error(
				`No parser could be inferred for file: ${options.filePath}`,
			),
		});
		expect(mockPrettier.format).not.toHaveBeenCalled();
	});

	it("resolves with the error when prettier throws an error", async () => {
		const error = new SyntaxError("Expression expected.");
		const mockPrettier = createMockPrettier();
		mockPrettier.format.mockRejectedValueOnce(error);
		mockRequire.mockReturnValueOnce(mockPrettier);

		const actual = await formatTextPrettier(options);

		expect(actual).toEqual({ error });
	});

	it("resolves with a wrapped error when prettier throws a non-error", async () => {
		const mockPrettier = createMockPrettier();
		mockPrettier.format.mockRejectedValueOnce("Oh no!");
		mockRequire.mockReturnValueOnce(mockPrettier);

		const actual = await formatTextPrettier(options);

		expect(actual).toEqual({ error: new Error("Oh no!") });
	});
});
