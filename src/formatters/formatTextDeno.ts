import * as fs from "node:fs/promises";
import path from "node:path";

import { FormatterTextRunner, FormatterTextRunnerOptions } from "../types.js";
import { runFormatterTextCommand } from "./runFormatterCommand.js";

/**
 * Deno formats stdin knowing only the file's extension, not its path, so it
 * can't apply fmt.exclude there. Instead of reimplementing Deno's include and
 * exclude semantics, this asks Deno to check the file on disk, which reports
 * no target files for an excluded path.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/626
 */
async function isExcludedByDeno(options: FormatterTextRunnerOptions) {
	try {
		await fs.access(options.filePath);
	} catch {
		return false;
	}

	const result = await runFormatterTextCommand(
		{ args: (filePath) => ["fmt", "--check", filePath], command: "deno" },
		options,
	);

	return !!result.error?.message.includes("No target files found");
}

export const formatTextDeno: FormatterTextRunner = async (options) => {
	const extension = path.extname(options.filePath).slice(1);

	if (!extension) {
		return {
			error: new Error(
				`deno fmt can't infer a file type without an extension: ${options.filePath}`,
			),
		};
	}

	const [excluded, result] = await Promise.all([
		isExcludedByDeno(options),
		runFormatterTextCommand(
			{ args: () => ["fmt", "--ext", extension, "-"], command: "deno" },
			options,
		),
	]);

	return excluded ? { formatted: options.text } : result;
};
