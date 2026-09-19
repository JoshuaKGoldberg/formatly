import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { runPrettier } from "./runPrettier.js";

const mockRequire = vi.fn();

vi.mock("node:module", () => ({
	createRequire: () => mockRequire,
}));

const mockRunPackageFormatterCommand = vi.fn();

vi.mock("./runFormatterCommand.js", () => ({
	get runPackageFormatterCommand() {
		return mockRunPackageFormatterCommand;
	},
}));

const options = {
	cwd: ".",
	patterns: ["."],
};

describe("runPrettier", () => {
	it("formats with the command when requiring the internal CLI modules fails", async () => {
		mockRequire.mockImplementation(() => {
			throw new Error("Module not found");
		});

		await runPrettier(options);

		expect(mockRequire.mock.calls).toEqual([
			["prettier/internal/legacy-cli.mjs"],
			["prettier/internal/cli.mjs"],
		]);
		expect(mockRunPackageFormatterCommand).toHaveBeenCalledWith(
			{ args: ["--write"], command: "prettier" },
			options,
		);
	});

	it("formats with the command without requiring the internal CLI module when cwd is not the process cwd", async () => {
		const cwd = path.resolve("elsewhere");

		await runPrettier({ ...options, cwd });

		expect(mockRequire).not.toHaveBeenCalled();
		expect(mockRunPackageFormatterCommand).toHaveBeenCalledWith(
			{ args: ["--write"], command: "prettier" },
			{ ...options, cwd },
		);
	});

	it("formats with the internal legacy CLI module when requiring it succeeds", async () => {
		const mockPrettierCli = {
			run: vi.fn(),
		};
		mockRequire.mockReturnValueOnce(mockPrettierCli);

		await runPrettier(options);

		expect(mockRequire.mock.calls).toEqual([
			["prettier/internal/legacy-cli.mjs"],
		]);
		expect(mockRunPackageFormatterCommand).not.toHaveBeenCalled();
		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--log-level",
			"silent",
			"--write",
			...options.patterns,
		]);
	});

	it("formats with the internal pre-3.6 CLI module when requiring the legacy one fails", async () => {
		const mockPrettierCli = {
			run: vi.fn(),
		};
		mockRequire
			.mockImplementationOnce(() => {
				throw new Error("Module not found");
			})
			.mockReturnValueOnce(mockPrettierCli);

		await runPrettier(options);

		expect(mockRequire.mock.calls).toEqual([
			["prettier/internal/legacy-cli.mjs"],
			["prettier/internal/cli.mjs"],
		]);
		expect(mockRunPackageFormatterCommand).not.toHaveBeenCalled();
		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--log-level",
			"silent",
			"--write",
			...options.patterns,
		]);
	});
});
