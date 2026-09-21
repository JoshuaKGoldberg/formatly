import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const bin = path.join(import.meta.dirname, "..", "bin", "index.mjs");
const lib = path.join(import.meta.dirname, "..", "lib", "cli.js");

const unformatted = "const value   =   1\n";
const formatted = "const value = 1;\n";

let directory: string;

beforeAll(async () => {
	if (!(await exists(lib))) {
		throw new Error(
			`${lib} does not exist: run \`pnpm build\` before testing.`,
		);
	}
});

beforeEach(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), "formatly-"));
});

afterEach(async () => {
	await fs.rm(directory, { force: true, recursive: true });
});

async function exists(filePath: string) {
	return await fs.access(filePath).then(
		() => true,
		() => false,
	);
}

async function isCommandAvailable(command: string) {
	try {
		await promisify(execFile)(command, ["--version"]);
		return true;
	} catch {
		return false;
	}
}

/**
 * Links a package installed in this repository into the temporary project,
 * along with its bin entries, the way a package manager would install it.
 */
async function linkPackage(packageName: string) {
	const packageJsonPath = require.resolve(`${packageName}/package.json`);
	const packageDirectory = path.dirname(packageJsonPath);
	const packageJson = JSON.parse(
		await fs.readFile(packageJsonPath, "utf8"),
	) as {
		bin?: Record<string, string> | string;
	};
	const bins =
		typeof packageJson.bin === "string"
			? { [path.basename(packageName)]: packageJson.bin }
			: (packageJson.bin ?? {});

	const nodeModules = path.join(directory, "node_modules");
	const linkDirectory = path.join(nodeModules, packageName);

	await fs.mkdir(path.dirname(linkDirectory), { recursive: true });
	await fs.symlink(packageDirectory, linkDirectory, "dir");

	const binDirectory = path.join(nodeModules, ".bin");
	await fs.mkdir(binDirectory, { recursive: true });

	for (const [name, file] of Object.entries(bins)) {
		await fs.symlink(
			path.join(linkDirectory, file),
			path.join(binDirectory, name),
			"file",
		);
	}
}

async function readFile(fileName: string) {
	return await fs.readFile(path.join(directory, fileName), "utf8");
}

async function runCli(...args: string[]) {
	try {
		const { stdout } = await promisify(execFile)(
			process.execPath,
			[bin, ...args],
			{
				cwd: directory,
			},
		);

		return { code: 0, stdout };
	} catch (error) {
		const { code, stderr } = error as { code: number; stderr: string };

		return { code, stderr };
	}
}

async function writeFile(fileName: string, contents: string) {
	await fs.writeFile(path.join(directory, fileName), contents);
}

// Deno is a runtime rather than an npm package, so it's expected on the PATH:
// CI installs it, and locally its test is skipped if it isn't installed.
const denoAvailable = await isCommandAvailable("deno");

describe("cli (end-to-end)", () => {
	it("formats with Biome when a biome.json exists", async () => {
		await linkPackage("@biomejs/biome");
		await writeFile("biome.json", "{}\n");
		await writeFile("index.js", unformatted);

		const result = await runCli("index.js");

		expect(result).toEqual({ code: 0, stdout: "Formatted with biome. 🧼\n" });
		expect(await readFile("index.js")).toBe(formatted);
	});

	it.skipIf(!denoAvailable && !process.env.CI)(
		"formats with Deno when a deno.json exists",
		async () => {
			await writeFile("deno.json", "{}\n");
			await writeFile("index.js", unformatted);

			const result = await runCli("index.js");

			expect(result).toEqual({ code: 0, stdout: "Formatted with deno. 🧼\n" });
			expect(await readFile("index.js")).toBe(formatted);
		},
	);

	it("formats with dprint when a dprint.json exists", async () => {
		await linkPackage("dprint");
		await linkPackage("@dprint/typescript");
		await writeFile(
			"dprint.json",
			JSON.stringify({
				plugins: ["./node_modules/@dprint/typescript/plugin.wasm"],
			}),
		);
		await writeFile("index.js", unformatted);

		const result = await runCli("index.js");

		expect(result).toEqual({ code: 0, stdout: "Formatted with dprint. 🧼\n" });
		expect(await readFile("index.js")).toBe(formatted);
	});

	it("formats with oxfmt when a .oxfmtrc.json exists", async () => {
		await linkPackage("oxfmt");
		await writeFile(".oxfmtrc.json", "{}\n");
		await writeFile("index.js", unformatted);

		const result = await runCli("index.js");

		expect(result).toEqual({ code: 0, stdout: "Formatted with oxfmt. 🧼\n" });
		expect(await readFile("index.js")).toBe(formatted);
	});

	it("formats with Prettier when a .prettierrc exists", async () => {
		await linkPackage("prettier");
		await writeFile(".prettierrc", "{}\n");
		await writeFile("index.js", unformatted);

		const result = await runCli("index.js");

		expect(result).toEqual({
			code: 0,
			stdout: "Formatted with prettier. 🧼\n",
		});
		expect(await readFile("index.js")).toBe(formatted);
	});

	it("reports the command without formatting when --dry-run is passed", async () => {
		await linkPackage("prettier");
		await writeFile(".prettierrc", "{}\n");
		await writeFile("index.js", unformatted);

		const result = await runCli("--dry-run", "index.js");

		expect(result).toEqual({
			code: 0,
			stdout: "Detected prettier. 🔍\nWould run: prettier --write index.js\n",
		});
		expect(await readFile("index.js")).toBe(unformatted);
	});

	it("exits with an error when no formatter can be detected", async () => {
		await writeFile("index.js", unformatted);

		const result = await runCli("index.js");

		expect(result).toEqual({
			code: 1,
			stderr: "Could not detect a formatter.\n",
		});
		expect(await readFile("index.js")).toBe(unformatted);
	});
});
