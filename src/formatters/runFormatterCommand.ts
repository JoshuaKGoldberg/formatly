import { spawn } from "child_process";
import { detect, type ResolvedCommand } from "package-manager-detector";
import { resolveCommand } from "package-manager-detector/commands";

import {
	FormatlyReportChildProcessResult,
	FormatterRunnerOptions,
} from "../types.js";

export async function runFormatterCommand(
	{ args, command }: ResolvedCommand,
	{ cwd, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult> {
	return await spawnFormatterCommand(
		{ args: [...args, ...patterns], command },
		cwd,
	);
}

export async function runPackageFormatterCommand(
	{ args, command }: ResolvedCommand,
	{ cwd, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult> {
	const packageArguments = [command, ...args, ...patterns];
	const resolvedCommand = resolveCommand(
		(await detect({ cwd }))?.agent ?? "npm",
		"execute-local",
		packageArguments,
	) ?? { args: packageArguments, command: "npx" };

	return await spawnFormatterCommand(resolvedCommand, cwd);
}

async function spawnFormatterCommand(
	{ args, command }: ResolvedCommand,
	cwd: string,
): Promise<FormatlyReportChildProcessResult> {
	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd });

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
