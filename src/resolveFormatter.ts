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
		const children = await readDirectory(directory);

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

	// Scripts running a format command are more telling than ones only
	// mentioning a formatter, such as "deno test" in a Prettier project.
	for (const tester of ["formatScript", "script"] as const) {
		for (const formatter of orderedFormatters) {
			for (const script of Object.values(scripts as object)) {
				if (formatter.testers[tester].test(script as string)) {
					return formatter;
				}
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
	const seen = new Set<FormatterName>();

	const preferred = order.map((name) => {
		const formatter = formatters.find((formatter) => formatter.name === name);

		if (!formatter) {
			throw new Error(
				`Unknown formatter name in order: ${name}. Known formatters are ${formatters.map((formatter) => formatter.name).join(", ")}.`,
			);
		}

		if (seen.has(name)) {
			throw new Error(`Duplicate formatter name in order: ${name}.`);
		}

		seen.add(name);

		return formatter;
	});

	return [...new Set([...preferred, ...formatters])];
}

async function readDirectory(directory: string) {
	try {
		return await fs.readdir(directory);
	} catch (error) {
		throw new Error(
			`Could not read directory searching for a formatter config file: ${path.resolve(directory)}.`,
			{ cause: error },
		);
	}
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
