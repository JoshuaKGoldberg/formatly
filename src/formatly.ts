import { spawn } from "node:child_process";

import { Formatter } from "./formatters.js";
import { resolveFormatter } from "./resolveFormatter.js";

export interface FormatlyOptions {
	cwd?: string;
}

export type FormatlyReport = FormatlyReportError | FormatlyReportResult;

export interface FormatlyReportChildProcessResult {
	code: null | number;
	signal: NodeJS.Signals | null;
}

export interface FormatlyReportError {
	message: string;
	ran: false;
}

export interface FormatlyReportResult {
	formatter: Formatter;
	ran: true;
	result: FormatlyReportChildProcessResult;
}

export async function formatly(
	patterns: string[],
	{ cwd }: FormatlyOptions = {},
): Promise<FormatlyReport> {
	if (!patterns.join("").trim()) {
		return {
			message: "No file patterns were provided to formatly.",
			ran: false,
		};
	}

	const formatter = await resolveFormatter(cwd);

	if (!formatter) {
		return { message: "Could not detect a reporter.", ran: false };
	}

	const [baseCommand, ...args] = formatter.runner.split(" ");

	return {
		formatter,
		ran: true,
		result: await new Promise((resolve, reject) => {
			const child = spawn(baseCommand, [...args, ...patterns], {
				cwd,
			});

			child.on("error", reject);
			child.on("exit", (code, signal) => {
				resolve({ code, signal });
			});
		}),
	};
}
