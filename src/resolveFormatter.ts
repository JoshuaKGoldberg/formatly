import { findPackage } from "fd-package-json";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { formatters } from "./formatters/all.js";
import { Formatter, ResolveFormatterOptions, StopDirectory } from "./types.js";

export async function resolveFormatter(
	cwd = ".",
	options: ResolveFormatterOptions = {},
): Promise<Formatter | undefined> {
	for (const directory of walkUpDirectories(cwd, options)) {
		const children = await fs.readdir(directory);

		for (const child of children) {
			for (const formatter of formatters) {
				if (formatter.testers.configFile.test(child)) {
					return formatter;
				}
			}
		}
	}

	const packageData = await findPackage(cwd);
	if (!packageData) {
		return undefined;
	}

	const { scripts = {}, ...otherKeys } = packageData;

	for (const script of Object.values(scripts as object)) {
		for (const formatter of formatters) {
			if (formatter.testers.script.test(script as string)) {
				return formatter;
			}
		}
	}

	for (const formatter of formatters) {
		if (
			"packageKey" in formatter.testers &&
			formatter.testers.packageKey in otherKeys
		) {
			return formatter;
		}
	}

	return undefined;
}

function createStopDirectoryMatcher(stopDirectory: StopDirectory) {
	if (typeof stopDirectory !== "string") {
		return stopDirectory;
	}

	const resolved = path.resolve(stopDirectory);

	return (currentDirectory: string) => currentDirectory === resolved;
}

function* walkUpDirectories(
	cwd: string,
	{ stopDirectory }: ResolveFormatterOptions,
) {
	if (stopDirectory === undefined) {
		yield cwd;
		return;
	}

	const isStopDirectory = createStopDirectoryMatcher(stopDirectory);
	let currentDirectory = path.resolve(cwd);

	while (true) {
		const parentDirectory = path.dirname(currentDirectory);
		const matched = isStopDirectory(currentDirectory);

		if (!matched && parentDirectory === currentDirectory) {
			throw new Error(
				`Reached the file system root searching up from ${path.resolve(cwd)} without matching stopDirectory.`,
			);
		}

		yield currentDirectory;

		if (matched) {
			return;
		}

		currentDirectory = parentDirectory;
	}
}
