import { stripVTControlCharacters } from "node:util";

import { Formatter } from "../types.js";
import {
	createCheckCommand,
	createCheckPackageCommand,
	createFormatTextPackageCommand,
	createRunCommand,
	createRunPackageCommand,
} from "./createRunCommand.js";
import { formatTextBiome } from "./formatTextBiome.js";
import { formatTextDeno } from "./formatTextDeno.js";
import { formatTextDprint } from "./formatTextDprint.js";
import { formatTextPrettier } from "./formatTextPrettier.js";
import { SpawnedOutput } from "./runFormatterCommand.js";
import { runPrettier } from "./runPrettier.js";

function parseLines({ stdout }: SpawnedOutput) {
	return stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

export const formatters = [
	{
		checker: createCheckPackageCommand({
			args: (filePaths) => [
				"format",
				"--no-errors-on-unmatched",
				"--reporter=github",
				...filePaths,
			],
			command: "biome",
			packageName: "@biomejs/biome",
			parse: ({ stdout }) =>
				Array.from(
					stdout.matchAll(/^::error title=format,file=([^,]+),/gm),
					([, filePath]) => decodeURIComponent(filePath),
				),
			parseFailures: ({ stdout }) =>
				Array.from(
					stdout.matchAll(
						/^::error title=(?!format,)[^,]+,file=([^,]+),[^:]*::(.*)$/gm,
					),
					([, filePath, message]) =>
						`${decodeURIComponent(filePath)}: ${message}`,
				),
		}),
		formatText: formatTextBiome,
		name: "biome",
		runner: createRunPackageCommand({
			args: ["format", "--no-errors-on-unmatched", "--write"],
			command: "biome",
			packageName: "@biomejs/biome",
		}),
		testers: {
			configFile: /^\.?biome\.jsonc?$/,
			formatScript: /(?<![\w-])biome\s+(?:check|ci|format)\b/,
			script: /(?<![\w-])biome(?![\w-])/,
		},
	},
	{
		checker: createCheckCommand({
			args: (filePaths) => ["fmt", "--check", ...filePaths],
			command: "deno",
			parse: ({ stderr }) =>
				Array.from(
					stripVTControlCharacters(stderr).matchAll(/^from (.+):$/gm),
					([, filePath]) => filePath,
				),
			parseFailures: ({ stderr }) =>
				Array.from(
					stripVTControlCharacters(stderr).matchAll(
						/^Error checking: (.+)\n[\t ]*(\S.*)$/gm,
					),
					([, filePath, message]) => `${filePath}: ${message}`,
				),
		}),
		formatText: formatTextDeno,
		name: "deno",
		runner: createRunCommand({
			args: ["fmt"],
			command: "deno",
		}),
		testers: {
			configFile: /^deno\.jsonc?$/,
			formatScript: /(?<![\w-])deno\s+fmt\b/,
			script: /(?<![\w-])deno(?![\w-])/,
		},
	},
	{
		checker: createCheckPackageCommand({
			args: (filePaths) => [
				"check",
				"--allow-no-files",
				"--list-different",
				...filePaths,
			],
			command: "dprint",
			differencesCode: 20,
			parse: parseLines,
		}),
		formatText: formatTextDprint,
		name: "dprint",
		runner: createRunPackageCommand({
			args: ["fmt", "--allow-no-files"],
			command: "dprint",
		}),
		testers: {
			configFile: /^\.?dprint\.jsonc?$/,
			formatScript: /(?<![\w-])dprint\s+(?:check|fmt)\b/,
			script: /(?<![\w-])dprint(?![\w-])/,
		},
	},
	{
		checker: createCheckPackageCommand({
			args: (filePaths) => [
				"--list-different",
				"--no-error-on-unmatched-pattern",
				...filePaths,
			],
			command: "oxfmt",
			parse: parseLines,
		}),
		formatText: createFormatTextPackageCommand({
			args: (filePath) => ["--stdin-filepath", filePath],
			command: "oxfmt",
		}),
		name: "oxfmt",
		runner: createRunPackageCommand({
			args: ["--no-error-on-unmatched-pattern"],
			command: "oxfmt",
		}),
		testers: {
			configFile: /^(?:\.oxfmtrc\.(?:json|jsonc)|oxfmt\.config\.(?:mts|ts))$/,
			formatScript: /(?<![\w-])oxfmt(?![\w-])/,
			script: /(?<![\w-])oxfmt(?![\w-])/,
		},
	},
	{
		checker: createCheckPackageCommand({
			args: (filePaths) => [
				"--ignore-unknown",
				"--list-different",
				...filePaths,
			],
			command: "prettier",
			parse: parseLines,
		}),
		formatText: formatTextPrettier,
		name: "prettier",
		runner: runPrettier,
		testers: {
			configFile:
				/^(?:\.prettierrc(?:\.(?:json5?|toml|ya?ml|[cm]?[jt]s))?|prettier\.config\.[cm]?[jt]s)$/,
			formatScript: /(?<![\w-])prettier(?![\w-])/,
			packageKey: "prettier",
			script: /(?<![\w-])prettier(?![\w-])/,
		},
	},
] as const satisfies Formatter[];
