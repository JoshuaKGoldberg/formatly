import { createRequire } from "node:module";
import path from "node:path";

import { FormatterRunner } from "../types.js";
import { runFormatterCommand } from "./runFormatterCommand.js";
import { wrapSafe } from "./wrapSafe.js";

/**
 * @see https://github.com/prettier/prettier/issues/17422
 * @see https://github.com/prettier/prettier/blob/e7202d63e715728bc891eab0075eddc6194980db/src/cli/index.js#L13
 */
interface PrettierInternalCLI {
	run(rawArguments?: string[]): Promise<void>;
}

export const runPrettier: FormatterRunner = async ({ cwd, patterns }) => {
	// We first try to load Prettier's CLI module directly.
	// It's not in prettier's exports, but CJS require() doesn't respect those.
	// See https://github.com/prettier/prettier/issues/17422
	const require = createRequire(path.join(cwd, "index.js"));
	const prettierCli = wrapSafe(
		() => require("prettier/internal/cli.mjs") as PrettierInternalCLI,
	);

	if (!prettierCli) {
		return await runFormatterCommand("npx prettier --write", { cwd, patterns });
	}

	await prettierCli.run(["--log-level", "silent", "--write", ...patterns]);

	return {
		runner: "virtual",
	};
};
