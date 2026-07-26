import { spawn } from "child_process";
import { detect } from "package-manager-detector";
import { resolveCommand } from "package-manager-detector/commands";

import {
	FormatlyReportChildProcessResult,
	FormatterRunnerOptions,
} from "../types.js";

export async function runFormatterCommand(
	runner: string,
	{ cwd, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult> {
	const [baseCommand, ...args] = runner.split(" ");
	const command =
		baseCommand === "npx"
			? (resolveCommand(
					(await detect({ cwd }))?.agent ?? "npm",
					"execute-local",
					[...args, ...patterns],
				) ?? { args: [...args, ...patterns], command: baseCommand })
			: { args: [...args, ...patterns], command: baseCommand };

	return await new Promise((resolve, reject) => {
		const child = spawn(command.command, command.args, { cwd });

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
