import { describe, expect, it, vi } from "vitest";

import { runPrettier } from "./runPrettier.js";

const mockRequire = vi.fn();

vi.mock("node:module", () => ({
	createRequire: () => mockRequire,
}));

const mockRunFormatterCommand = vi.fn();

vi.mock("./runFormatterCommand.js", () => ({
	get runFormatterCommand() {
		return mockRunFormatterCommand;
	},
}));

const options = {
	cwd: ".",
	patterns: ["."],
};

describe("runPrettier", () => {
	it("formats with the command when requiring the internal CLI module fails", async () => {
		mockRequire.mockImplementationOnce(() => {
			throw new Error("Module not found");
		});

		await runPrettier(options);

		expect(mockRunFormatterCommand).toHaveBeenCalledWith(
			"npx prettier --write",
			options,
		);
	});

	it("formats with the internal CLI module when requiring it succeeds", async () => {
		const mockPrettierCli = {
			run: vi.fn(),
		};
		mockRequire.mockReturnValueOnce(mockPrettierCli);

		await runPrettier(options);

		expect(mockRunFormatterCommand).not.toHaveBeenCalled();
		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--log-level",
			"silent",
			"--write",
			...options.patterns,
		]);
	});
});
