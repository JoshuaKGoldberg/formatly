import { describe, expect, it, vi } from "vitest";

import { formatters } from "./formatters/all.js";
import { resolveFormatter } from "./resolveFormatter.js";

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

	describe("from config file", () => {
		it.each([
			["biome", "biome.json", [".git", "biome.json", "src"]],
			["deno", "deno.json", [".git", "deno.json", "src"]],
			["dprint", "dprint.json", [".git", "dprint.json", "src"]],
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
