import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runPrettier } from "./runPrettier.js";

// This test intentionally doesn't mock anything: it uses the Prettier
// installed in this repository to make sure its internal CLI module loads.
// See https://github.com/JoshuaKGoldberg/formatly/issues/574

let directory: string;

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "formatly-"));
});

afterEach(async () => {
	await fs.rm(directory, { force: true, recursive: true });
});

describe("runPrettier (integration)", () => {
	it("formats in-memory using the installed Prettier's internal CLI module when cwd is the process cwd", async () => {
		const filePath = path.join(directory, "index.js");
		await fs.writeFile(filePath, "const value   =   1\n");

		const result = await runPrettier({
			cwd: process.cwd(),
			patterns: [filePath],
		});

		expect(result).toEqual({ runner: "virtual" });
		expect(await fs.readFile(filePath, "utf8")).toBe("const value = 1;\n");
	});
});
