import { formatters } from "./formatters/all.ts";
import { resolveFormatter } from "./resolveFormatter.ts";
import { FormatlyOptions } from "./types.ts";

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
