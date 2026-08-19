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

function stubPrettierCli() {
	const mockPrettierCli = { run: vi.fn() };

	mockRequire.mockReturnValueOnce(mockPrettierCli);

	return mockPrettierCli;
}

describe("runPrettier", () => {
	it("formats with the command when requiring the internal CLI module fails", async () => {
		mockRequire.mockImplementationOnce(() => {
			throw new Error("Module not found");
		});

		await runPrettier(options);

		expect(mockRunPackageFormatterCommand).toHaveBeenCalledWith(
			{ args: ["--write"], command: "prettier" },
			options,
		);
	});

	it("formats with the internal CLI module when requiring it succeeds", async () => {
		const mockPrettierCli = stubPrettierCli();

		await runPrettier(options);

		expect(mockRunPackageFormatterCommand).not.toHaveBeenCalled();
		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--ignore-path",
			path.join(options.cwd, ".gitignore"),
			"--ignore-path",
			path.join(options.cwd, ".prettierignore"),
			"--log-level",
			"silent",
			"--write",
			path.resolve(options.cwd, "."),
		]);
	});

	it("passes cwd-relative patterns when cwd is provided", async () => {
		const cwd = path.resolve("fake-cwd");
		const mockPrettierCli = stubPrettierCli();

		await runPrettier({ cwd, patterns: ["src", "docs/**/*.md"] });

		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--ignore-path",
			path.join(cwd, ".gitignore"),
			"--ignore-path",
			path.join(cwd, ".prettierignore"),
			"--log-level",
			"silent",
			"--write",
			path.join(cwd, "src"),
			path.join(cwd, "docs/**/*.md"),
		]);
	});

	it("keeps the negation prefix when a pattern is negated", async () => {
		const cwd = path.resolve("fake-cwd");
		const mockPrettierCli = stubPrettierCli();

		await runPrettier({ cwd, patterns: ["**/*.ts", "!dist/**"] });

		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--ignore-path",
			path.join(cwd, ".gitignore"),
			"--ignore-path",
			path.join(cwd, ".prettierignore"),
			"--log-level",
			"silent",
			"--write",
			path.join(cwd, "**/*.ts"),
			`!${path.join(cwd, "dist/**")}`,
		]);
	});

	it("leaves patterns unchanged when they are already absolute", async () => {
		const cwd = path.resolve("fake-cwd");
		const absolutePattern = path.resolve("elsewhere", "src");
		const mockPrettierCli = stubPrettierCli();

		await runPrettier({ cwd, patterns: [absolutePattern] });

		expect(mockPrettierCli.run).toHaveBeenCalledWith([
			"--ignore-path",
			path.join(cwd, ".gitignore"),
			"--ignore-path",
			path.join(cwd, ".prettierignore"),
			"--log-level",
			"silent",
			"--write",
			absolutePattern,
		]);
	});
});
