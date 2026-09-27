import path from "node:path";
import { stripVTControlCharacters } from "node:util";

import { Formatter } from "../types.js";
import {
	createCheckCommand,
	createCheckPackageCommand,
	createFormatTextCommand,
	createFormatTextPackageCommand,
	createRunCommand,
	createRunPackageCommand,
} from "./createRunCommand.js";
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
			args: (filePaths) => ["format", "--reporter=github", ...filePaths],
			command: "biome",
			packageName: "@biomejs/biome",
			parse: ({ stdout }) =>
				Array.from(
					stdout.matchAll(/^::error title=format,file=([^,]+),/gm),
					([, filePath]) => decodeURIComponent(filePath),
				),
		}),
		formatText: createFormatTextPackageCommand({
			args: (filePath) => ["format", `--stdin-file-path=${filePath}`],
			command: "biome",
			packageName: "@biomejs/biome",
		}),
		name: "biome",
		runner: createRunPackageCommand({
			args: ["format", "--write"],
			command: "biome",
			packageName: "@biomejs/biome",
		}),
		testers: {
			configFile: /biome\.json/,
			script: /biome\s+format/,
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
		}),
		// deno fmt reads stdin as "-" and can only be told the file's extension,
		// not its path, so per-path config overrides don't apply.
		formatText: createFormatTextCommand({
			args: (filePath) => {
				const extension = path.extname(filePath).slice(1);
				return ["fmt", ...(extension ? ["--ext", extension] : []), "-"];
			},
			command: "deno",
		}),
		name: "deno",
		runner: createRunCommand({
			args: ["fmt"],
			command: "deno",
		}),
		testers: {
			configFile: /deno\.json/,
			script: /deno/,
		},
	},
	{
		checker: createCheckPackageCommand({
			args: (filePaths) => ["check", "--list-different", ...filePaths],
			command: "dprint",
			differencesCode: 20,
			parse: parseLines,
		}),
		formatText: createFormatTextPackageCommand({
			args: (filePath) => ["fmt", "--stdin", filePath],
			command: "dprint",
		}),
		name: "dprint",
		runner: createRunPackageCommand({
			args: ["fmt"],
			command: "dprint",
		}),
		testers: {
			configFile: /dprint\.json/,
			script: /dprint/,
		},
	},
	{
		checker: createCheckCommand({
			args: (filePaths) => ["oxfmt", "--list-different", ...filePaths],
			command: "npx",
			parse: parseLines,
		}),
		formatText: createFormatTextCommand({
			args: (filePath) => ["oxfmt", "--stdin-filepath", filePath],
			command: "npx",
		}),
		name: "oxfmt",
		runner: createRunCommand({
			args: ["oxfmt"],
			command: "npx",
		}),
		testers: {
			configFile: /^(?:\.oxfmtrc\.(?:json|jsonc)|oxfmt\.config\.(?:mts|ts))$/,
			script: /oxfmt/,
		},
	},
	{
		checker: createCheckPackageCommand({
			args: (filePaths) => ["--list-different", ...filePaths],
			command: "prettier",
			parse: parseLines,
		}),
		formatText: formatTextPrettier,
		name: "prettier",
		runner: runPrettier,
		testers: {
			configFile: /prettier(?:rc|\.)/,
			packageKey: "prettier",
			script: /prettier/,
		},
	},
] as const satisfies Formatter[];
