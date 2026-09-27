import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { FormatterTextRunner, FormatTextResult } from "../types.js";
import { runPackageFormatterTextCommand } from "./runFormatterCommand.js";
import { wrapSafe } from "./wrapSafe.js";

/**
 * The subset of `@biomejs/js-api` used to format text in-process.
 * @see https://biomejs.dev/reference/js-api
 */
interface BiomeApi {
	Biome: new () => {
		applyConfiguration(projectKey: number, configuration: object): void;
		formatContent(
			projectKey: number,
			content: string,
			options: { filePath: string },
		): { content: string; diagnostics: { description: string }[] };
		openProject(path?: string): { projectKey: number };
	};
}

interface BiomeConfiguration {
	extends?: unknown;
	root?: boolean;
}

type InProcessFormatter = (filePath: string, text: string) => FormatTextResult;

const biomeConfigFileNames = [
	"biome.json",
	"biome.jsonc",
	".biome.json",
	".biome.jsonc",
];

const inProcessFormatters = new Map<
	string,
	Promise<InProcessFormatter | undefined>
>();

async function createInProcessFormatter(
	cwd: string,
): Promise<InProcessFormatter | undefined> {
	const require = createRequire(path.join(cwd, "index.js"));
	const readVersion = (packageName: string) =>
		wrapSafe(
			() =>
				(require(`${packageName}/package.json`) as { version: string }).version,
		);

	const biomeVersion = readVersion("@biomejs/biome");

	if (!biomeVersion || biomeVersion !== readVersion("@biomejs/wasm-nodejs")) {
		return undefined;
	}

	const api = wrapSafe(() => require("@biomejs/js-api/nodejs") as BiomeApi);
	const config = await findConfiguration(cwd);

	if (
		!api ||
		config?.configuration.extends ||
		config?.configuration.root === false
	) {
		return undefined;
	}

	const directory = config?.directory ?? cwd;
	const biome = new api.Biome();
	const { projectKey } = biome.openProject(directory);

	if (config) {
		biome.applyConfiguration(projectKey, config.configuration);
	}

	return (filePath, text) => {
		const { content, diagnostics } = biome.formatContent(projectKey, text, {
			filePath: path.relative(directory, filePath),
		});

		return diagnostics.length
			? {
					error: new Error(
						diagnostics.map(({ description }) => description).join("\n"),
					),
				}
			: { formatted: content };
	};
}

async function findConfiguration(cwd: string) {
	let directory = path.resolve(cwd);

	while (true) {
		for (const fileName of biomeConfigFileNames) {
			const text = await fs
				.readFile(path.join(directory, fileName), "utf8")
				.catch(() => undefined);

			if (text !== undefined) {
				return {
					configuration: parseJsonc(text) as BiomeConfiguration,
					directory,
				};
			}
		}

		const parent = path.dirname(directory);

		if (parent === directory) {
			return undefined;
		}

		directory = parent;
	}
}

function parseJsonc(text: string): unknown {
	return JSON.parse(
		text.replaceAll(
			/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\/|,(?=\s*[}\]])/g,
			(_, string?: string) => string ?? "",
		),
	);
}

/**
 * Formats in-process with `@biomejs/js-api` when the project has it installed
 * along with a `@biomejs/wasm-nodejs` matching its `@biomejs/biome` version.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/633
 */
export const formatTextBiome: FormatterTextRunner = async (options) => {
	let inProcessFormatter = inProcessFormatters.get(options.cwd);

	if (!inProcessFormatter) {
		inProcessFormatter = createInProcessFormatter(options.cwd).catch(
			() => undefined,
		);
		inProcessFormatters.set(options.cwd, inProcessFormatter);
	}

	const format = await inProcessFormatter;

	if (format) {
		try {
			return format(options.filePath, options.text);
		} catch (error) {
			return {
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	return await runPackageFormatterTextCommand(
		{
			args: (filePath) => ["format", `--stdin-file-path=${filePath}`],
			command: "biome",
			packageName: "@biomejs/biome",
		},
		options,
	);
};
