import { createRequire } from "node:module";
import { createCli } from "parse-standard-args";
import { z } from "zod";

import { formatly } from "./formatly.js";

const { version } = createRequire(import.meta.url)("../package.json") as {
	version: string;
};

const formatlyCli = createCli({
	description:
		"Formats files with whatever formatter your project is already using.",
	name: "formatly",
	options: z.object({
		"dry-run": z
			.boolean()
			.default(false)
			.describe("Report the detected formatter and command without formatting"),
	}),
	positionals: z.array(z.string()).meta({ placeholder: "patterns" }),
	version,
});

export async function cli(args: string[]) {
	const parsed = await formatlyCli.parse(args);

	switch (parsed.type) {
		case "error":
			console.error(parsed.text);
			return 1;

		case "help":
		case "version":
			console.log(parsed.text);
			return 0;
	}

	const { positionals, values } = parsed;
	const patterns = withOptionTerminator(args, positionals);

	let result;

	try {
		result = await formatly(patterns, { dryRun: values["dry-run"] });
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

/**
 * Re-inserts a `--` option terminator into patterns where it was in the raw args,
 * so it continues to be passed through to the formatter.
 * @param args Raw command-line args.
 * @param positionals Positionals parsed from the args, without the terminator.
 * @returns The positionals, with `--` before any that came after it in the args.
 */
function withOptionTerminator(args: string[], positionals: string[]) {
	const terminatorIndex = args.indexOf("--");

	if (terminatorIndex === -1) {
		return positionals;
	}

	// Everything after the terminator is a positional.
	const insertIndex = positionals.length - (args.length - terminatorIndex - 1);

	return [
		...positionals.slice(0, insertIndex),
		"--",
		...positionals.slice(insertIndex),
	];
}
