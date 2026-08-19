import { formatly } from "./formatly.js";

export async function cli(args: string[]) {
	const result = await formatly(args);

	if (result.ran) {
		console.log(`Formatted with ${result.formatter.name}. 🧼`);
		return 0;
	}

	console.error(result.message);
	return 1;
}
