import type { KnipConfig } from "knip";

export default {
	entry: ["src/**/*.test.*"],
	ignoreDependencies: [
		"@biomejs/biome",
		"@dprint/typescript",
		"dprint",
		"oxfmt",
	],
	ignoreExportsUsedInFile: { interface: true, type: true },
	project: ["src/**/*.ts!"],
	treatConfigHintsAsErrors: true,
} satisfies KnipConfig;
