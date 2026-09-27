import { createRequire } from "node:module";
import path from "node:path";

import { FormatterRunner } from "../types.js";
import { limitConcurrency } from "./limitConcurrency.js";
import { runPackageFormatterCommand } from "./runFormatterCommand.js";
import { wrapSafe } from "./wrapSafe.js";

/**
 * @see https://github.com/prettier/prettier/issues/17422
 * @see https://github.com/prettier/prettier/blob/e7202d63e715728bc891eab0075eddc6194980db/src/cli/index.js#L13
 */
interface PrettierInternalCLI {
	run(rawArguments?: string[]): Promise<void>;
}

/**
 * Prettier 3.6 split internal/cli.mjs into internal/legacy-cli.mjs and
 * internal/experimental-cli.mjs. Only the legacy module exports run():
 * the experimental one reads process.argv and formats as a side effect of
 * being imported.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/574
 */
const prettierInternalCliModules = [
	"prettier/internal/legacy-cli.mjs",
	"prettier/internal/cli.mjs",
];

/**
 * Files Prettier has no parser for are skipped, as with patterns like "*".
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/636
 */
const args = ["--write", "--ignore-unknown"];

function requirePrettierInternalCli(cwd: string) {
	// The CLI module isn't in prettier's exports, but CJS require() doesn't respect those.
	// See https://github.com/prettier/prettier/issues/17422
	const require = createRequire(path.resolve(cwd, "index.js"));

	for (const moduleName of prettierInternalCliModules) {
		const prettierCli = wrapSafe(
			() => require(moduleName) as PrettierInternalCLI,
		);

		if (prettierCli) {
			return prettierCli;
		}
	}

	return undefined;
}

/**
 * Prettier's CLI reports failures by setting the global process.exitCode,
 * so in-process runs go one at a time to keep their exit codes apart.
 */
const runPrettierCli = limitConcurrency(
	async (prettierCli: PrettierInternalCLI, rawArguments: string[]) => {
		const previousExitCode = process.exitCode;
		process.exitCode = undefined;

		try {
			await prettierCli.run(rawArguments);
			return readExitCode();
		} finally {
			process.exitCode = previousExitCode;
		}
	},
	1,
);

function readExitCode() {
	return Number(process.exitCode ?? 0);
}

export const runPrettier: FormatterRunner = async ({
	cwd,
	dryRun,
	patterns,
}) => {
	// Prettier's CLI has no --cwd flag: it expands patterns, looks for its
	// default ignore files, and locates its cache relative to process.cwd().
	// Rather than reimplement those from the outside, we only format in-memory
	// when the requested cwd is the process's, and spawn a child process otherwise.
	// See https://github.com/JoshuaKGoldberg/formatly/issues/563
	const prettierCli =
		path.resolve(cwd) === process.cwd()
			? requirePrettierInternalCli(cwd)
			: undefined;

	if (!prettierCli) {
		return await runPackageFormatterCommand(
			{ args, command: "prettier" },
			{ cwd, dryRun, patterns },
		);
	}

	if (dryRun) {
		return {
			args: [...args, ...patterns],
			command: "prettier",
			runner: "dry-run",
		};
	}

	return {
		code: await runPrettierCli(prettierCli, [
			"--log-level",
			"warn",
			...args,
			...patterns,
		]),
		runner: "virtual",
	};
};
