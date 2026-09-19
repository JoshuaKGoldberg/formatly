import path from "node:path";

import { formatters } from "./formatters/all.js";
import { resolveFormatter } from "./resolveFormatter.js";
import { FormatOptions, FormatReport } from "./types.js";

export async function format(
	text: string,
	options: FormatOptions,
): Promise<FormatReport> {
	if (!options.filePath.trim()) {
		return {
			message: "No file path was provided to format.",
			ran: false,
		};
	}

	const { cwd = process.cwd(), order, stopDirectory } = options;

	const formatter = options.formatter
		? formatters.find((f) => f.name === options.formatter)
		: await resolveFormatter(cwd, { order, stopDirectory });

	if (!formatter) {
		return { message: "Could not detect a formatter.", ran: false };
	}

	return {
		formatter,
		ran: true,
		...(await formatter.formatText({
			cwd,
			filePath: path.resolve(cwd, options.filePath),
			text,
		})),
	};
}
