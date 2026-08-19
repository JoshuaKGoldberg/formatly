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

function resolvePattern(cwd: string, pattern: string) {
	return pattern.startsWith("!")
		? `!${path.resolve(cwd, pattern.slice(1))}`
		: path.resolve(cwd, pattern);
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
		return await runPackageFormatterCommand(
			{ args: ["--write"], command: "prettier" },
			{ cwd, patterns },
		);
	}

	// Prettier's CLI has no --cwd flag: it expands patterns and looks for its
	// default ignore files relative to process.cwd(). Anchoring both to cwd keeps
	// this runner equivalent to running the prettier binary with that cwd.
	// See https://github.com/JoshuaKGoldberg/formatly/issues/563
	await prettierCli.run([
		"--ignore-path",
		path.join(cwd, ".gitignore"),
		"--ignore-path",
		path.join(cwd, ".prettierignore"),
		"--log-level",
		"silent",
		"--write",
		...patterns.map((pattern) => resolvePattern(cwd, pattern)),
	]);

	return {
		runner: "virtual",
	};
};
