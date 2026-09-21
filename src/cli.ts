import { formatly } from "./formatly.js";

const dryRunFlag = "--dry-run";

export async function cli(args: string[]) {
	const dryRun = args.includes(dryRunFlag);
	const patterns = args.filter((arg) => arg !== dryRunFlag);

	const result = await formatly(patterns, { dryRun });

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

	console.log(`Formatted with ${result.formatter.name}. 🧼`);
	return 0;
}
