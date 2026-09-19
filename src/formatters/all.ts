import path from "node:path";

import { Formatter } from "../types.js";
import {
	createFormatTextCommand,
	createFormatTextPackageCommand,
	createRunCommand,
	createRunPackageCommand,
} from "./createRunCommand.js";
import { formatTextPrettier } from "./formatTextPrettier.js";
import { runPrettier } from "./runPrettier.js";

export const formatters = [
	{
		formatText: createFormatTextPackageCommand({
			args: (filePath) => ["format", `--stdin-file-path=${filePath}`],
			command: "@biomejs/biome",
		}),
		name: "biome",
		runner: createRunPackageCommand({
			args: ["format", "--write"],
			command: "@biomejs/biome",
		}),
		testers: {
			configFile: /biome\.json/,
			script: /biome\s+format/,
		},
	},
	{
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
