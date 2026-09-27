import { spawn } from "child_process";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	type Agent,
	detect,
	type ResolvedCommand,
} from "package-manager-detector";
import { resolveCommand } from "package-manager-detector/commands";

import {
	FormatFilesResult,
	FormatlyReportChildProcessResult,
	FormatlyReportDryRunResult,
	FormatterCheckerOptions,
	FormatterRunnerOptions,
	FormatterTextRunnerOptions,
	FormatTextResult,
} from "../types.js";
import { limitConcurrency } from "./limitConcurrency.js";

/**
 * A command that lists which of the given files aren't formatted.
 */
export interface FormatCheckCommand {
	args: (filePaths: string[]) => string[];
	command: string;

	/**
	 * Exit code the command uses to report unformatted files, if not 1.
	 */
	differencesCode?: number;

	/**
	 * Parses the command's output into the paths of unformatted files.
	 */
	parse: (output: SpawnedOutput) => string[];

	/**
	 * Parses the command's output into failures other than unformatted files,
	 * for commands that also exit with the differences code on errors.
	 */
	parseFailures?: (output: SpawnedOutput) => string[];
}

/**
 * A {@link FormatCheckCommand} run through the project's package manager.
 */
export interface FormatCheckPackageCommand
	extends FormatCheckCommand, PackageCommandSource {}

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

export interface SpawnedOutput {
	code: null | number;
	error?: never;
	signal: NodeJS.Signals | null;
	stderr: string;
	stdout: string;
}

export function createOutputError(
	command: string,
	{
		code,
		signal,
		stderr = "",
	}: Pick<SpawnedOutput, "code" | "signal"> & { stderr?: string },
) {
	const reason =
		signal === null
			? `exited with code ${String(code)}`
			: `was terminated by signal ${signal}`;

	return new Error(
		[`${path.basename(command)} ${reason}.`, stderr.trim()]
			.filter(Boolean)
			.join("\n"),
	);
}

export async function runFormatterCheckCommand(
	{ args, ...check }: FormatCheckCommand,
	{ cwd, filePaths }: FormatterCheckerOptions,
): Promise<FormatFilesResult> {
	return await spawnFormatterCheckCommand(
		check,
		{ args: args(filePaths), command: check.command },
		{ cwd, filePaths },
	);
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

export async function runPackageFormatterCheckCommand(
	{ args, command, packageName, ...check }: FormatCheckPackageCommand,
	{ cwd, filePaths }: FormatterCheckerOptions,
): Promise<FormatFilesResult> {
	return await spawnFormatterCheckCommand(
		check,
		await resolvePackageCommand({ command, packageName }, args(filePaths), cwd),
		{ cwd, filePaths },
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

/**
 * Finds a bin installed in node_modules/.bin of cwd or any of its parents.
 * Spawning it directly skips the package manager's startup cost.
 * Windows is skipped because its bins are .cmd shims that need a shell.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/629
 */
export async function resolvePackageCommand(
	{ command, packageName = command }: PackageCommandSource,
	args: string[],
	cwd: string,
): Promise<ResolvedCommand> {
	const bin = await findLocalBin(command, cwd);

	if (bin) {
		return { args, command: bin };
	}

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

async function findLocalBin(command: string, cwd: string) {
	if (process.platform === "win32") {
		return undefined;
	}

	let directory = path.resolve(cwd);

	while (true) {
		const bin = path.join(directory, "node_modules", ".bin", command);

		try {
			await fs.access(bin);
			return bin;
		} catch {
			const parent = path.dirname(directory);

			if (parent === directory) {
				return undefined;
			}

			directory = parent;
		}
	}
}

/**
 * Formatters may list files by their real paths, so both sides are compared that way.
 */
async function resolveRealPaths(filePaths: string[]) {
	return await Promise.all(
		filePaths.map((filePath) => fs.realpath(filePath).catch(() => filePath)),
	);
}

async function spawnFormatterCheckCommand(
	{
		differencesCode = 1,
		parse,
		parseFailures,
	}: Pick<FormatCheckCommand, "differencesCode" | "parse" | "parseFailures">,
	resolved: ResolvedCommand,
	{ cwd, filePaths }: FormatterCheckerOptions,
): Promise<FormatFilesResult> {
	const output = await spawnOutput(resolved, cwd);

	if (output.error) {
		return { error: output.error };
	}

	if (output.code === 0 || output.code === differencesCode) {
		const failures = parseFailures?.(output) ?? [];

		if (failures.length) {
			return {
				error: createOutputError(resolved.command, {
					...output,
					stderr: failures.join("\n"),
				}),
			};
		}

		const listed = new Set(
			await resolveRealPaths(
				parse(output).map((filePath) => path.resolve(cwd, filePath)),
			),
		);
		const realFilePaths = await resolveRealPaths(filePaths);

		return {
			changed: filePaths.filter((_, index) => listed.has(realFilePaths[index])),
		};
	}

	return { error: createOutputError(resolved.command, output) };
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
		const child = spawn(command, args, {
			cwd,
			stdio: ["ignore", "ignore", "inherit"],
		});

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

/**
 * Formatting many files at once would otherwise spawn a process tree per file.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/628
 */
const spawnFormatterTextCommand = limitConcurrency(
	spawnFormatterTextProcess,
	os.availableParallelism(),
);

async function spawnFormatterTextProcess(
	resolved: ResolvedCommand,
	cwd: string,
	text: string,
): Promise<FormatTextResult> {
	const output = await spawnOutput(resolved, cwd, text);

	if (output.error) {
		return { error: output.error };
	}

	if (output.code === 0) {
		return { formatted: output.stdout };
	}

	return { error: createOutputError(resolved.command, output) };
}

async function spawnOutput(
	{ args, command }: ResolvedCommand,
	cwd: string,
	text = "",
): Promise<SpawnedOutput | { error: Error }> {
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
			resolve({
				code,
				signal,
				stderr: Buffer.concat(stderr).toString(),
				stdout: Buffer.concat(stdout).toString(),
			});
		});

		// A formatter that fails before reading its input closes stdin early.
		// The failure is reported by the "close" event, so the EPIPE is ignored.
		child.stdin.on("error", () => undefined);
		child.stdin.end(text);
	});
}
