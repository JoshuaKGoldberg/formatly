import { Formatter } from "../types.js";
import {
	createRunCommand,
	createRunPackageCommand,
} from "./createRunCommand.js";
import { runPrettier } from "./runPrettier.js";

export const formatters = [
	{
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
		name: "prettier",
		runner: runPrettier,
		testers: {
			configFile: /prettier(?:rc|\.)/,
			packageKey: "prettier",
			script: /prettier/,
		},
	},
] as const satisfies Formatter[];
