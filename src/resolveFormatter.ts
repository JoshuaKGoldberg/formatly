import { findPackage } from "fd-package-json";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { formatters } from "./formatters/all.js";
import {
	Formatter,
	FormatterName,
	ResolveFormatterOptions,
	StopDirectory,
} from "./types.js";

export async function resolveFormatter(
	cwd = ".",
	options: ResolveFormatterOptions = {},
): Promise<Formatter | undefined> {
	const orderedFormatters = orderFormatters(options.order);

	for (const directory of walkUpDirectories(cwd, options)) {
		const children = await fs.readdir(directory);

		for (const formatter of orderedFormatters) {
			for (const child of children) {
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

	for (const formatter of orderedFormatters) {
		for (const script of Object.values(scripts as object)) {
			if (formatter.testers.script.test(script as string)) {
				return formatter;
			}
		}
	}

	for (const formatter of orderedFormatters) {
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

function orderFormatters(order: FormatterName[] = []) {
	const preferred = order.map((name) => {
		const formatter = formatters.find((formatter) => formatter.name === name);

		if (!formatter) {
			throw new Error(
				`Unknown formatter name in order: ${name}. Known formatters are ${formatters.map((formatter) => formatter.name).join(", ")}.`,
			);
		}

		return formatter;
	});

	return [...new Set([...preferred, ...formatters])];
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
