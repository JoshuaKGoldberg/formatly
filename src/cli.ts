import { createRequire } from "node:module";

import { formatly } from "./formatly.js";

const dryRunFlag = "--dry-run";
const helpFlags = new Set(["--help", "-h"]);
const versionFlags = new Set(["--version", "-v"]);

const help = `Usage: formatly [--dry-run] <patterns...>

Formats files with whatever formatter your project is already using.

Options:
  --dry-run      Report the detected formatter and command without formatting
  -h, --help     Show this help message
  -v, --version  Show formatly's version`;

export async function cli(args: string[]) {
	if (args.some((arg) => helpFlags.has(arg))) {
		console.log(help);
		return 0;
	}

	if (args.some((arg) => versionFlags.has(arg))) {
		const require = createRequire(import.meta.url);
		const { version } = require("../package.json") as { version: string };
		console.log(version);
		return 0;
	}

	const dryRun = args.includes(dryRunFlag);
	const patterns = args.filter((arg) => arg !== dryRunFlag);

	let result;

	try {
		result = await formatly(patterns, { dryRun });
	} catch (error) {
		console.error(`Failed running formatly: ${String(error)} 🛑`);
		return 1;
	}

	if (!result.ran) {
		console.error(result.message);
		return 1;
	}

	if (result.result.runner === "dry-run") {
		const { args, command } = result.result;
		console.log(`Detected ${result.formatter.name}. 🔍`);
		console.log(`Would run: ${[command, ...args].join(" ")}`);
		return 0;
	}

	if (result.result.runner === "child_process" && result.result.signal) {
		console.error(
			`Failed formatting with ${result.formatter.name} (signal ${result.result.signal}). 🛑`,
		);
		return 1;
	}

	const { code } = result.result;

	if (code) {
		console.error(
			`Failed formatting with ${result.formatter.name} (exit code ${code.toString()}). 🛑`,
		);
		return code;
	}

	console.log(`Formatted with ${result.formatter.name}. 🧼`);
	return 0;
}
