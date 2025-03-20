import { describe, expect, it, vi } from "vitest";

import { formatters } from "./formatters.js";
import { resolveFormatter } from "./resolveFormatter.js";

const mockReaddir = vi.fn();

vi.mock("node:fs/promises", () => ({
	get readdir() {
		return mockReaddir;
	},
}));

const mockFindNearestPackageJson = vi.hoisted(() => vi.fn());

vi.mock("./utils.js", async (importOriginal) => {
	const original: Record<string, unknown> = await importOriginal();
	return {
		...original,
		findNearestPackageJson: mockFindNearestPackageJson,
	};
});

describe("resolveFormatter", () => {
	describe("from config file", () => {
		it.each([
			["Biome", "biome.json", [".git", "biome.json", "src"]],
			["deno fmt", "deno.json", [".git", "deno.json", "src"]],
			["dprint", "dprint.json", [".git", "dprint.json", "src"]],
			["Prettier", ".prettierrc", [".git", ".prettierrc", "src"]],
			["Prettier", "prettier.config.js", [".git", ".prettierrc", "src"]],
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
			mockFindNearestPackageJson.mockResolvedValueOnce(undefined);

			const formatter = await resolveFormatter();

			expect(formatter).toBeUndefined();
		});

		it.each([
			["Biome", "biome format"],
			["deno fmt", "deno fmt"],
			["dprint", "dprint"],
			["Prettier", "prettier"],
		])(
			"resolves with %s when %s exists in a script",
			async (formatterName, scriptValue) => {
				mockReaddir.mockResolvedValueOnce([]);
				mockFindNearestPackageJson.mockResolvedValueOnce({
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

		it.each([["Prettier", "prettier"]])(
			"resolves with %s when %s exists as a key",
			async (formatterName, key) => {
				mockReaddir.mockResolvedValueOnce([]);
				mockFindNearestPackageJson.mockResolvedValueOnce({
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
		mockFindNearestPackageJson.mockResolvedValueOnce({
			otherKey: true,
			scripts: { totally: "unrelated" },
		});

		const formatter = await resolveFormatter();

		expect(formatter).toBeUndefined();
	});
});
