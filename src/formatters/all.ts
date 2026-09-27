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
			args: (filePaths) => ["format", "--reporter=github", ...filePaths],
			command: "biome",
			packageName: "@biomejs/biome",
			parse: ({ stdout }) =>
				Array.from(
					stdout.matchAll(/^::error title=format,file=([^,]+),/gm),
					([, filePath]) => decodeURIComponent(filePath),
				),
		}),
		formatText: formatTextBiome,
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
		formatText: formatTextDeno,
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
		formatText: formatTextDprint,
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
		checker: createCheckPackageCommand({
			args: (filePaths) => ["--list-different", ...filePaths],
			command: "oxfmt",
			parse: parseLines,
		}),
		formatText: createFormatTextPackageCommand({
			args: (filePath) => ["--stdin-filepath", filePath],
			command: "oxfmt",
		}),
		name: "oxfmt",
		runner: createRunPackageCommand({
			args: [],
			command: "oxfmt",
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
