import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatTextBiome } from "./formatTextBiome.js";

const mockRunPackageFormatterTextCommand = vi.fn();

vi.mock("./runFormatterCommand.js", () => ({
	get runPackageFormatterTextCommand() {
		return mockRunPackageFormatterTextCommand;
	},
}));

const require = createRequire(import.meta.url);

const text = "function f(){return 1}\n";

let directory: string;

async function linkPackages(...packageNames: string[]) {
	for (const packageName of packageNames) {
		const linkPath = path.join(directory, "node_modules", packageName);

		await fs.mkdir(path.dirname(linkPath), { recursive: true });
		await fs.symlink(
			path.dirname(require.resolve(`${packageName}/package.json`)),
			linkPath,
			"dir",
		);
	}
}

async function writeFile(fileName: string, contents: string) {
	await fs.writeFile(path.join(directory, fileName), contents);
}

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "formatly-"));
});

afterEach(async () => {
	await fs.rm(directory, { force: true, recursive: true });
});

describe("formatTextBiome (integration)", () => {
	describe("with @biomejs/js-api installed", () => {
		beforeEach(async () => {
			await linkPackages(
				"@biomejs/biome",
				"@biomejs/js-api",
				"@biomejs/wasm-nodejs",
			);
		});

		it("formats in-process using the project's config and overrides", async () => {
			await writeFile(
				"biome.jsonc",
				`{
					// Comments are allowed in biome.jsonc.
					"formatter": { "indentStyle": "space", "indentWidth": 4 },
					"overrides": [
						{ "formatter": { "indentWidth": 2 }, "includes": ["src/**"] },
					],
				}`,
			);

			const results = await Promise.all(
				["index.ts", "src/index.ts"].map((fileName) =>
					formatTextBiome({
						cwd: directory,
						filePath: path.join(directory, fileName),
						text,
					}),
				),
			);

			expect(results).toEqual([
				{ formatted: "function f() {\n    return 1;\n}\n" },
				{ formatted: "function f() {\n  return 1;\n}\n" },
			]);
			expect(mockRunPackageFormatterTextCommand).not.toHaveBeenCalled();
		});

		it("formats in-process with a cwd relative to the process cwd", async () => {
			await writeFile("biome.json", "{}");

			const result = await formatTextBiome({
				cwd: path.relative(process.cwd(), directory),
				filePath: path.join(directory, "index.ts"),
				text,
			});

			expect(result).toEqual({ formatted: "function f() {\n\treturn 1;\n}\n" });
			expect(mockRunPackageFormatterTextCommand).not.toHaveBeenCalled();
		});

		it("resolves with the diagnostics for invalid text", async () => {
			await writeFile("biome.json", "{}");

			const result = await formatTextBiome({
				cwd: directory,
				filePath: path.join(directory, "index.ts"),
				text: "const =\n",
			});

			expect(result.error).toBeInstanceOf(Error);
			expect(result.formatted).toBeUndefined();
		});

		it("formats in-process with the default config when there is no config file", async () => {
			const result = await formatTextBiome({
				cwd: directory,
				filePath: path.join(directory, "index.ts"),
				text,
			});

			expect(result).toEqual({ formatted: "function f() {\n\treturn 1;\n}\n" });
			expect(mockRunPackageFormatterTextCommand).not.toHaveBeenCalled();
		});

		it("resolves with an error when Biome can't format the file type", async () => {
			const result = await formatTextBiome({
				cwd: directory,
				filePath: path.join(directory, "data.unknown"),
				text,
			});

			expect(result.error?.message).toContain("data.unknown");
			expect(mockRunPackageFormatterTextCommand).not.toHaveBeenCalled();
		});

		it("formats with the command when the config is nested", async () => {
			await writeFile("biome.json", JSON.stringify({ root: false }));
			mockRunPackageFormatterTextCommand.mockResolvedValueOnce({
				formatted: text,
			});

			await formatTextBiome({
				cwd: directory,
				filePath: path.join(directory, "index.ts"),
				text,
			});

			expect(mockRunPackageFormatterTextCommand).toHaveBeenCalled();
		});

		it("formats with the command when the config extends another", async () => {
			await writeFile("biome.json", JSON.stringify({ extends: ["base.json"] }));
			mockRunPackageFormatterTextCommand.mockResolvedValueOnce({
				formatted: text,
			});

			const result = await formatTextBiome({
				cwd: directory,
				filePath: path.join(directory, "index.ts"),
				text,
			});

			expect(result).toEqual({ formatted: text });
			expect(mockRunPackageFormatterTextCommand).toHaveBeenCalled();
		});
	});

	it("formats with the command when @biomejs/wasm-nodejs isn't installed", async () => {
		await linkPackages("@biomejs/biome", "@biomejs/js-api");
		await writeFile("biome.json", "{}");
		mockRunPackageFormatterTextCommand.mockResolvedValueOnce({
			formatted: text,
		});

		const result = await formatTextBiome({
			cwd: directory,
			filePath: path.join(directory, "index.ts"),
			text,
		});

		expect(result).toEqual({ formatted: text });
		expect(mockRunPackageFormatterTextCommand).toHaveBeenCalledWith(
			expect.objectContaining({ command: "biome" }),
			expect.objectContaining({ cwd: directory }),
		);
	});
});
