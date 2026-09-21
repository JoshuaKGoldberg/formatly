import { spawn } from "child_process";
import { detect, type ResolvedCommand } from "package-manager-detector";
import { resolveCommand } from "package-manager-detector/commands";

import {
	FormatlyReportChildProcessResult,
	FormatlyReportDryRunResult,
	FormatterRunnerOptions,
	FormatterTextRunnerOptions,
	FormatTextResult,
} from "../types.js";

/**
 * A command that formats text piped in through stdin and prints to stdout.
 * Formatters take the file's path through different flags, so args are
 * created from the path rather than listed statically.
 */
export interface FormatTextCommand {
	args: (filePath: string) => string[];
	command: string;
}

export async function runFormatterCommand(
	{ args, command }: ResolvedCommand,
	{ cwd, dryRun, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult | FormatlyReportDryRunResult> {
	return await spawnFormatterCommand(
		{ args: [...args, ...patterns], command },
		cwd,
		dryRun,
	);
}

export async function runFormatterTextCommand(
	{ args, command }: FormatTextCommand,
	{ cwd, filePath, text }: FormatterTextRunnerOptions,
): Promise<FormatTextResult> {
	return await spawnFormatterTextCommand(
		{ args: args(filePath), command },
		cwd,
		text,
	);
}

export async function runPackageFormatterCommand(
	{ args, command }: ResolvedCommand,
	{ cwd, dryRun, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult | FormatlyReportDryRunResult> {
	return await spawnFormatterCommand(
		await resolvePackageCommand([command, ...args, ...patterns], cwd),
		cwd,
		dryRun,
	);
}

export async function runPackageFormatterTextCommand(
	{ args, command }: FormatTextCommand,
	{ cwd, filePath, text }: FormatterTextRunnerOptions,
): Promise<FormatTextResult> {
	return await spawnFormatterTextCommand(
		await resolvePackageCommand([command, ...args(filePath)], cwd),
		cwd,
		text,
	);
}

async function resolvePackageCommand(
	packageArguments: string[],
	cwd: string,
): Promise<ResolvedCommand> {
	return (
		resolveCommand(
			(await detect({ cwd }))?.agent ?? "npm",
			"execute-local",
			packageArguments,
		) ?? { args: packageArguments, command: "npx" }
	);
}

async function spawnFormatterCommand(
	{ args, command }: ResolvedCommand,
	cwd: string,
	dryRun: boolean | undefined,
): Promise<FormatlyReportChildProcessResult | FormatlyReportDryRunResult> {
	if (dryRun) {
		return { args, command, runner: "dry-run" };
	}

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

async function spawnFormatterTextCommand(
	{ args, command }: ResolvedCommand,
	cwd: string,
	text: string,
): Promise<FormatTextResult> {
	return await new Promise((resolve) => {
		const child = spawn(command, args, { cwd, stdio: "pipe" });
		const stderr: Buffer[] = [];
		const stdout: Buffer[] = [];

		child.stderr.on("data", (data: Buffer) => stderr.push(data));
		child.stdout.on("data", (data: Buffer) => stdout.push(data));

		child.on("error", (error) => {
			resolve({ error });
		});
		child.on("close", (code, signal) => {
			if (code === 0) {
				resolve({ formatted: Buffer.concat(stdout).toString() });
				return;
			}

			const reason =
				signal === null
					? `exited with code ${String(code)}`
					: `was terminated by signal ${signal}`;

			resolve({
				error: new Error(
					[`${command} ${reason}.`, Buffer.concat(stderr).toString().trim()]
						.filter(Boolean)
						.join("\n"),
				),
			});
		});

		// A formatter that fails before reading its input closes stdin early.
		// The failure is reported by the "close" event, so the EPIPE is ignored.
		child.stdin.on("error", () => undefined);
		child.stdin.end(text);
	});
}
