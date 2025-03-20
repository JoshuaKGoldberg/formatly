import { execa, Result } from "execa";

import { Formatter, FormatterName, formatters } from "./formatters.js";
import { resolveFormatter } from "./resolveFormatter.js";

export interface FormatlyOptions {
	cwd?: string;

	/**
	 * Pass an explicitly formatter to use instead of automatically detecting
	 */
	formatter?: FormatterName;
}

export type FormatlyReport = FormatlyReportError | FormatlyReportResult;

export interface FormatlyReportError {
	message: string;
	ran: false;
}

export interface FormatlyReportResult {
	formatter: Formatter;
	ran: true;
	result: Result;
}

export async function formatly(
	patterns: string[],
	options: FormatlyOptions = {},
): Promise<FormatlyReport> {
	if (!patterns.join("").trim()) {
		return {
			message: "No file patterns were provided to formatly.",
			ran: false,
		};
	}

	const formatter = options.formatter
		? formatters.find((f) => f.name === options.formatter)
		: await resolveFormatter(options.cwd);

	if (!formatter) {
		return { message: "Could not detect a reporter.", ran: false };
	}

	const [baseCommand, ...args] = formatter.runner.split(" ");

	return {
		formatter,
		ran: true,
		result: await execa(baseCommand, [...args, ...patterns]),
	};
}
