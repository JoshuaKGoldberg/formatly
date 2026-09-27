import { Formatter } from "../types.js";
import {
	createFormatTextPackageCommand,
	createRunCommand,
	createRunPackageCommand,
} from "./createRunCommand.js";
import { formatTextDeno } from "./formatTextDeno.js";
import { formatTextPrettier } from "./formatTextPrettier.js";
import { runPrettier } from "./runPrettier.js";

export const formatters = [
	{
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
