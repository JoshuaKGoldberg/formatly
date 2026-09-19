import { createRequire } from "node:module";
import path from "node:path";

import { FormatterRunner } from "../types.js";
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

function requirePrettierInternalCli(cwd: string) {
	// The CLI module isn't in prettier's exports, but CJS require() doesn't respect those.
	// See https://github.com/prettier/prettier/issues/17422
	const require = createRequire(path.join(cwd, "index.js"));

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

export const runPrettier: FormatterRunner = async ({ cwd, patterns }) => {
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
			{ args: ["--write"], command: "prettier" },
			{ cwd, patterns },
		);
	}

	await prettierCli.run(["--log-level", "silent", "--write", ...patterns]);

	return {
		runner: "virtual",
	};
};
