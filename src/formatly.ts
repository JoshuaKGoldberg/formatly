import { spawn } from "node:child_process";
import {
	Agent,
	detect,
	resolveCommand,
	ResolvedCommand,
} from "package-manager-detector";

import { Formatter, FormatterName, formatters } from "./formatters.js";
import { resolveFormatter } from "./resolveFormatter.js";

export interface FormatlyOptions {
	cwd?: string;

	/**
	 * Pass an explicit formatter to use instead of automatically detecting
	 */
	formatter?: FormatterName;

	/**
	 * Pass an explicit package manager to use for executing formatting commands
	 * instead of automatically detecting
	 */
	packageManager?: Agent;
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

	let baseCommand: string | undefined;
	let args: string[] | undefined;
	if (formatter.runner.startsWith("npx ")) {
		const resolved = await resolveNpxCommand(
			formatter.runner,
			options.cwd,
			options.packageManager,
		);
		if (resolved) {
			baseCommand = resolved.command;
			args = resolved.args;
		}
	}
	if (baseCommand == null || args == null) {
		[baseCommand, ...args] = formatter.runner.split(" ");
	}

	return {
		formatter,
		ran: true,
		result: await new Promise((resolve, reject) => {
			const child = spawn(baseCommand, [...args, ...patterns], {
				cwd: process.cwd(),
			});

			child.on("error", reject);
			child.on("exit", (code, signal) => {
				resolve({ code, signal });
			});
		}),
	};
}

async function resolveNpxCommand(
	runner: string,
	cwd?: string,
	packageManager?: Agent,
): Promise<ResolvedCommand | undefined> {
	const agent = packageManager ?? (await detect({ cwd }))?.agent;
	if (!agent) {
		return;
	}

	const command = resolveCommand(
		agent,
		"execute-local",
		runner.split(" ").slice(1),
	);
	if (!command) {
		return;
	}

	return command;
}
