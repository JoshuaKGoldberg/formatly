import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { formatTextDeno } from "./formatTextDeno.js";

const denoAvailable = await promisify(execFile)("deno", ["--version"]).then(
	() => true,
	() => false,
);

const text = "const value   =   1\n";

let directory: string;

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "formatly-"));

	await fs.writeFile(
		path.join(directory, "deno.json"),
		JSON.stringify({ fmt: { exclude: ["excluded.ts"] } }),
	);
});

afterEach(async () => {
	await fs.rm(directory, { force: true, recursive: true });
});

describe.skipIf(!denoAvailable && !process.env.CI)(
	"formatTextDeno (integration)",
	() => {
		it("formats a file that isn't excluded", async () => {
			const filePath = path.join(directory, "included.ts");
			await fs.writeFile(filePath, text);

			const result = await formatTextDeno({ cwd: directory, filePath, text });

			expect(result).toEqual({ formatted: "const value = 1;\n" });
		});

		it("leaves a file excluded by fmt.exclude unchanged", async () => {
			const filePath = path.join(directory, "excluded.ts");
			await fs.writeFile(filePath, text);

			const result = await formatTextDeno({ cwd: directory, filePath, text });

			expect(result).toEqual({ formatted: text });
		});
	},
);
