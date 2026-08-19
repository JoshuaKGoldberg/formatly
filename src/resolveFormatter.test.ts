import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { formatters } from "./formatters/all.js";
import { resolveFormatter } from "./resolveFormatter.js";
import { FormatterName } from "./types.js";

const mockReaddir = vi.fn();

vi.mock("node:fs/promises", () => ({
	get readdir() {
		return mockReaddir;
	},
}));

const mockFindPackage = vi.fn();

vi.mock("fd-package-json", () => ({
	get findPackage() {
		return mockFindPackage;
	},
}));

describe("resolveFormatter", () => {
	describe("cwd", () => {
		it("defaults cwd to . when not provided", async () => {
			mockReaddir.mockResolvedValueOnce(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			await resolveFormatter();

			expect(mockReaddir).toHaveBeenCalledWith(".");
			expect(mockFindPackage).toHaveBeenCalledWith(".");
		});

		it("uses the cwd when provided", async () => {
			const cwd = "some/other/path";
			mockReaddir.mockResolvedValueOnce(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			await resolveFormatter(cwd);

			expect(mockReaddir).toHaveBeenCalledWith(cwd);
			expect(mockFindPackage).toHaveBeenCalledWith(cwd);
		});
	});

	describe("stopDirectory", () => {
		it("searches only the cwd when stopDirectory is not provided", async () => {
			const cwd = path.join(path.resolve("/"), "repo", "packages", "child");
			mockReaddir.mockResolvedValueOnce(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			await resolveFormatter(cwd);

			expect(mockReaddir.mock.calls).toEqual([[cwd]]);
		});

		it("resolves with a formatter when a parent directory within stopDirectory has a config file", async () => {
			const stopDirectory = path.join(path.resolve("/"), "repo");
			const cwd = path.join(stopDirectory, "packages", "child");
			mockReaddir
				.mockResolvedValueOnce(["src"])
				.mockResolvedValueOnce(["child"])
				.mockResolvedValueOnce([".git", ".prettierrc"]);

			const formatter = await resolveFormatter(cwd, { stopDirectory });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "prettier"),
			);
			expect(mockReaddir.mock.calls).toEqual([
				[cwd],
				[path.join(stopDirectory, "packages")],
				[stopDirectory],
			]);
		});

		it("resolves with undefined when no config file exists in any directory up to stopDirectory", async () => {
			const stopDirectory = path.join(path.resolve("/"), "repo");
			const cwd = path.join(stopDirectory, "packages", "child");
			mockReaddir.mockResolvedValue(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			const formatter = await resolveFormatter(cwd, { stopDirectory });

			expect(formatter).toBeUndefined();
			expect(mockReaddir.mock.calls).toEqual([
				[cwd],
				[path.join(stopDirectory, "packages")],
				[stopDirectory],
			]);
		});

		it("resolves stopDirectory relative to the process working directory when provided a relative path", async () => {
			const cwd = path.join(process.cwd(), "child");
			mockReaddir.mockResolvedValue(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			await resolveFormatter(cwd, { stopDirectory: "." });

			expect(mockReaddir.mock.calls).toEqual([[cwd], [process.cwd()]]);
		});

		it("stops after the directory matched by stopDirectory when provided a function", async () => {
			const root = path.join(path.resolve("/"), "repo");
			const cwd = path.join(root, "packages", "child");
			mockReaddir.mockResolvedValue(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			await resolveFormatter(cwd, {
				stopDirectory: (currentDirectory) =>
					path.basename(currentDirectory) === "packages",
			});

			expect(mockReaddir.mock.calls).toEqual([
				[cwd],
				[path.join(root, "packages")],
			]);
		});

		it("throws an error when the file system root is reached before stopDirectory matches", async () => {
			const root = path.resolve("/");
			const cwd = path.join(root, "repo", "child");
			mockReaddir.mockResolvedValue(["totally", "unrelated"]);

			await expect(
				resolveFormatter(cwd, { stopDirectory: () => false }),
			).rejects.toThrow(
				`Reached the file system root searching up from ${cwd} without matching stopDirectory.`,
			);
		});

		it("resolves with a formatter when the file system root has a config file and matches stopDirectory", async () => {
			const root = path.resolve("/");
			const cwd = path.join(root, "repo");
			mockReaddir
				.mockResolvedValueOnce(["totally", "unrelated"])
				.mockResolvedValueOnce([".prettierrc"]);

			const formatter = await resolveFormatter(cwd, { stopDirectory: root });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "prettier"),
			);
		});

		it("falls back to the package.json of the cwd when no directory up to stopDirectory has a config file", async () => {
			const stopDirectory = path.join(path.resolve("/"), "repo");
			const cwd = path.join(stopDirectory, "packages", "child");
			mockReaddir.mockResolvedValue(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce({
				scripts: { format: "prettier" },
			});

			const formatter = await resolveFormatter(cwd, { stopDirectory });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "prettier"),
			);
			expect(mockFindPackage).toHaveBeenCalledWith(cwd);
		});
	});

	describe("order", () => {
		it("resolves with biome when order is not provided and multiple config files exist", async () => {
			mockReaddir.mockResolvedValueOnce(["biome.json", ".prettierrc"]);

			const formatter = await resolveFormatter();

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "biome"),
			);
		});

		it("resolves with prettier when order prefers prettier over biome", async () => {
			mockReaddir.mockResolvedValueOnce(["biome.json", ".prettierrc"]);

			const formatter = await resolveFormatter(".", { order: ["prettier"] });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "prettier"),
			);
		});

		it("throws an error when order lists a formatter more than once", async () => {
			await expect(
				resolveFormatter(".", { order: ["prettier", "prettier"] }),
			).rejects.toThrow("Duplicate formatter name in order: prettier.");
		});

		it("resolves with biome when order only lists formatters without a config file", async () => {
			mockReaddir.mockResolvedValueOnce(["biome.json"]);

			const formatter = await resolveFormatter(".", { order: ["prettier"] });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "biome"),
			);
		});

		it("resolves with prettier when order prefers prettier and both formatters exist in scripts", async () => {
			mockReaddir.mockResolvedValueOnce([]);
			mockFindPackage.mockResolvedValueOnce({
				scripts: { format: "biome format", lint: "prettier" },
			});

			const formatter = await resolveFormatter(".", { order: ["prettier"] });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "prettier"),
			);
		});

		it("throws an error when order includes an unknown formatter name", async () => {
			const order: string[] = ["unknown"];

			await expect(
				resolveFormatter(".", { order: order as FormatterName[] }),
			).rejects.toThrow(
				"Unknown formatter name in order: unknown. Known formatters are biome, deno, dprint, oxfmt, prettier.",
			);
		});

		it("resolves with prettier when order prefers prettier and only a package key matches", async () => {
			mockReaddir.mockResolvedValueOnce([]);
			mockFindPackage.mockResolvedValueOnce({ prettier: {} });

			const formatter = await resolveFormatter(".", { order: ["prettier"] });

			expect(formatter).toBe(
				formatters.find((formatter) => formatter.name === "prettier"),
			);
		});
	});

	describe("from config file", () => {
		it.each([
			["biome", "biome.json", [".git", "biome.json", "src"]],
			["deno", "deno.json", [".git", "deno.json", "src"]],
			["dprint", "dprint.json", [".git", "dprint.json", "src"]],
			["oxfmt", ".oxfmtrc.json", [".git", ".oxfmtrc.json", "src"]],
			["oxfmt", ".oxfmtrc.jsonc", [".git", ".oxfmtrc.jsonc", "src"]],
			["oxfmt", "oxfmt.config.ts", [".git", "oxfmt.config.ts", "src"]],
			["oxfmt", "oxfmt.config.mts", [".git", "oxfmt.config.mts", "src"]],
			["prettier", ".prettierrc", [".git", ".prettierrc", "src"]],
			["prettier", "prettier.config.js", [".git", ".prettierrc", "src"]],
		])(
			"resolves with %s when %s exist(s)",
			async (formatterName, _, children) => {
				mockReaddir.mockResolvedValueOnce(children);

				const formatter = await resolveFormatter();

				expect(formatter).toBe(
					formatters.find((formatter) => formatter.name === formatterName),
				);
			},
		);
	});

	describe("from package.json", () => {
		it("resolves with undefined when no config file matches and a package.json cannot be found", async () => {
			mockReaddir.mockResolvedValueOnce(["totally", "unrelated"]);
			mockFindPackage.mockResolvedValueOnce(undefined);

			const formatter = await resolveFormatter();

			expect(formatter).toBeUndefined();
		});

		it.each([
			["biome", "biome format"],
			["deno", "deno fmt"],
			["dprint", "dprint"],
			["oxfmt", "oxfmt"],
			["prettier", "prettier"],
		])(
			"resolves with %s when %s exists in a script",
			async (formatterName, scriptValue) => {
				mockReaddir.mockResolvedValueOnce([]);
				mockFindPackage.mockResolvedValueOnce({
					scripts: {
						script: scriptValue,
					},
				});

				const formatter = await resolveFormatter();

				expect(formatter).toBe(
					formatters.find((formatter) => formatter.name === formatterName),
				);
			},
		);

		it.each([["prettier", "prettier"]])(
			"resolves with %s when %s exists as a key",
			async (formatterName, key) => {
				mockReaddir.mockResolvedValueOnce([]);
				mockFindPackage.mockResolvedValueOnce({
					[key]: {},
				});

				const formatter = await resolveFormatter();

				expect(formatter).toBe(
					formatters.find((formatter) => formatter.name === formatterName),
				);
			},
		);
	});

	it("resolves with undefined when no config file, scripts, or package keys matched", async () => {
		mockReaddir.mockResolvedValueOnce(["totally", "unrelated"]);
		mockFindPackage.mockResolvedValueOnce({
			otherKey: true,
			scripts: { totally: "unrelated" },
		});

		const formatter = await resolveFormatter();

		expect(formatter).toBeUndefined();
	});
});
