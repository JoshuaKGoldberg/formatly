export interface Formatter {
	name: FormatterName;
	runner: string;
	testers: {
		configFile: RegExp;
		packageKey?: string;
		script: RegExp;
	};
}

export type FormatterName = "Biome" | "deno fmt" | "dprint" | "Prettier";

export const formatters = [
	{
		name: "Biome",
		runner: "npx @biomejs/biome format --write",
		testers: {
			configFile: /biome\.json/,
			script: /biome\s+format/,
		},
	},
	{
		name: "deno fmt",
		runner: "deno fmt",
		testers: {
			configFile: /deno\.json/,
			script: /deno/,
		},
	},
	{
		name: "dprint",
		runner: "npx dprint",
		testers: {
			configFile: /dprint\.json/,
			script: /dprint/,
		},
	},
	{
		name: "Prettier",
		runner: "npx prettier --write",
		testers: {
			configFile: /prettier(?:rc|\.)/,
			packageKey: "prettier",
			script: /prettier/,
		},
	},
] as const satisfies Formatter[];
