import { formatters } from "./formatters/all.js";
import { resolveFormatter } from "./resolveFormatter.js";
import { FormatlyOptions } from "./types.js";

export async function selectFormatter(
	cwd: string,
	{ formatter, order, stopDirectory }: FormatlyOptions,
) {
	return formatter
		? formatters.find((f) => f.name === formatter)
		: await resolveFormatter(cwd, { order, stopDirectory });
}
