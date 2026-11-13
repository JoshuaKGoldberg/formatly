import { createRequire } from "node:module";
import path from "node:path";

import { FormatterTextRunner } from "../types.js";
import { runPackageFormatterTextCommand } from "./runFormatterCommand.js";
import { wrapSafe } from "./wrapSafe.js";

/**
 * The subset of Prettier's public API used to format text in-memory.
 * @see https://prettier.io/docs/api
 */
interface PrettierApi {
	format(source: string, options: PrettierOptions): Promise<string>;
	getFileInfo(
		filePath: string,
		options: {
			ignorePath: string[];
			plugins?: unknown;
			resolveConfig: boolean;
			withNodeModules?: boolean;
		},
	): Promise<{ ignored: boolean; inferredParser: null | string }>;
	resolveConfig(
		filePath: string,
		options: { editorconfig: boolean },
	): Promise<null | PrettierOptions>;
}

type PrettierOptions = Record<string, unknown> & { filepath?: string };

function requirePrettier(cwd: string) {
	// Formatting with the project's own Prettier makes sure its version,
	// plugins, and config resolution all match what the project uses.
	const require = createRequire(path.resolve(cwd, "index.js"));

	return wrapSafe(() => require("prettier") as PrettierApi);
}

export const formatTextPrettier: FormatterTextRunner = async (options) => {
	const prettier = requirePrettier(options.cwd);

	if (!prettier) {
		return await runPackageFormatterTextCommand(
			{
				args: (filePath) => ["--stdin-filepath", filePath],
				command: "prettier",
			},
			options,
		);
	}

	const { filePath, text } = options;

	try {
		// Prettier's CLI leaves ignored files as-is, so the same is done here.
		// Config is resolved once below, so getFileInfo doesn't resolve it too.
		const { ignored } = await prettier.getFileInfo(filePath, {
			ignorePath: [
				path.join(options.cwd, ".prettierignore"),
				path.join(options.cwd, ".gitignore"),
			],
			resolveConfig: false,
		});

		if (ignored) {
			return { formatted: text };
		}

		const config = await prettier.resolveConfig(filePath, {
			editorconfig: true,
		});

		// A parser set in config, such as in an override, takes precedence.
		// Otherwise the parser is inferred with the config's plugins, which
		// may add languages. The ignore check above already ran.
		const parser =
			config?.parser ??
			(
				await prettier.getFileInfo(filePath, {
					ignorePath: [],
					plugins: config?.plugins,
					resolveConfig: false,
					withNodeModules: true,
				})
			).inferredParser;

		if (!parser) {
			return {
				error: new Error(`No parser could be inferred for file: ${filePath}`),
			};
		}

		return {
			formatted: await prettier.format(text, { ...config, filepath: filePath }),
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
};
