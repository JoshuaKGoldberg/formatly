import { spawn } from "child_process";

import {
	FormatlyReportChildProcessResult,
	FormatterRunnerOptions,
} from "../types.js";

export async function runFormatterCommand(
	runner: string,
	{ cwd, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult> {
	const [baseCommand, ...args] = runner.split(" ");

	return await new Promise((resolve, reject) => {
		const child = spawn(baseCommand, [...args, ...patterns], { cwd });

		child.on("error", reject);
		child.on("exit", (code, signal) => {
			resolve({
				code,
				runner: "child_process",
				signal,
			});
		});
	});
}
