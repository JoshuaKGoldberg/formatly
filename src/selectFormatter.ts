import { formatters } from "./formatters/all.js";
import { resolveFormatter } from "./resolveFormatter.js";
import { FormatlyOptions } from "./types.js";

export async function selectFormatter(
	cwd: string,
	{ formatter, order, stopDirectory }: FormatlyOptions,
) {
	if (!formatter) {
		return await resolveFormatter(cwd, { order, stopDirectory });
	}

	const found = formatters.find((f) => f.name === formatter);

	if (!found) {
		throw new Error(
			`Unknown formatter name: ${formatter}. Known formatters are ${formatters.map((formatter) => formatter.name).join(", ")}.`,
		);
	}

	return found;
}
