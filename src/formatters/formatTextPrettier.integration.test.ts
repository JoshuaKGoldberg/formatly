import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { formatTextPrettier } from "./formatTextPrettier.js";

// This test intentionally doesn't mock anything: it links the Prettier
// installed in this repository into a temporary project to make sure text is
// formatted in-memory with that project's config, not the process's cwd.

const require = createRequire(import.meta.url);

let directory: string;

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "formatly-"));

	await fs.mkdir(path.join(directory, "node_modules"));
	await fs.symlink(
		path.dirname(require.resolve("prettier/package.json")),
		path.join(directory, "node_modules", "prettier"),
		"dir",
	);
	await fs.writeFile(
		path.join(directory, ".prettierrc"),
		JSON.stringify({
			overrides: [{ files: "src/**", options: { singleQuote: true } }],
			semi: false,
		}),
	);
	await fs.writeFile(path.join(directory, ".prettierignore"), "ignored.js\n");
});

afterEach(async () => {
	await fs.rm(directory, { force: true, recursive: true });
});

describe("formatTextPrettier (integration)", () => {
	it("formats in-memory using the project's Prettier and config", async () => {
		const result = await formatTextPrettier({
			cwd: directory,
			filePath: path.join(directory, "index.ts"),
			text: 'const value   =   "abc"\n',
		});

		expect(result).toEqual({ formatted: 'const value = "abc"\n' });
	});

	it("applies per-path config overrides from the file path", async () => {
		const result = await formatTextPrettier({
			cwd: directory,
			filePath: path.join(directory, "src", "index.ts"),
			text: 'const value   =   "abc"\n',
		});

		expect(result).toEqual({ formatted: "const value = 'abc'\n" });
	});

	it("leaves ignored files unchanged", async () => {
		const text = 'const value   =   "abc"\n';

		const result = await formatTextPrettier({
			cwd: directory,
			filePath: path.join(directory, "ignored.js"),
			text,
		});

		expect(result).toEqual({ formatted: text });
	});

	it("resolves with the syntax error for invalid text", async () => {
		const result = await formatTextPrettier({
			cwd: directory,
			filePath: path.join(directory, "index.ts"),
			text: "const value   =\n",
		});

		expect(result.error).toBeInstanceOf(SyntaxError);
		expect(result.formatted).toBeUndefined();
	});
});
