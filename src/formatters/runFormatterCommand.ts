import { spawn } from "child_process";
import {
	type Agent,
	detect,
	type ResolvedCommand,
} from "package-manager-detector";
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

/**
 * A {@link FormatTextCommand} run through the project's package manager.
 */
export interface FormatTextPackageCommand
	extends FormatTextCommand, PackageCommandSource {}

/**
 * A command run through the project's package manager.
 */
export interface PackageCommand extends PackageCommandSource, ResolvedCommand {}

interface PackageCommandSource {
	/**
	 * The command's bin name.
	 */
	command: string;

	/**
	 * The npm package providing the bin, if it's named differently than the bin.
	 */
	packageName?: string;
}

/**
 * Agents whose local execute command takes a package name rather than a bin name.
 * npx and bun x map package names to their bins, and download packages that
 * aren't installed, so passing a bin name risks running an unrelated package.
 * Other package managers only execute bins already installed in the project.
 */
const agentsExecutingPackageNames = new Set<Agent>(["bun", "npm"]);

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
	{ args, ...source }: PackageCommand,
	{ cwd, dryRun, patterns }: FormatterRunnerOptions,
): Promise<FormatlyReportChildProcessResult | FormatlyReportDryRunResult> {
	return await spawnFormatterCommand(
		await resolvePackageCommand(source, [...args, ...patterns], cwd),
		cwd,
		dryRun,
	);
}

export async function runPackageFormatterTextCommand(
	{ args, ...source }: FormatTextPackageCommand,
	{ cwd, filePath, text }: FormatterTextRunnerOptions,
): Promise<FormatTextResult> {
	return await spawnFormatterTextCommand(
		await resolvePackageCommand(source, args(filePath), cwd),
		cwd,
		text,
	);
}

async function resolvePackageCommand(
	{ command, packageName = command }: PackageCommandSource,
	args: string[],
	cwd: string,
): Promise<ResolvedCommand> {
	const agent = (await detect({ cwd }))?.agent ?? "npm";
	const executable = agentsExecutingPackageNames.has(agent)
		? packageName
		: command;

	return (
		resolveCommand(agent, "execute-local", [executable, ...args]) ?? {
			args: [packageName, ...args],
			command: "npx",
		}
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
