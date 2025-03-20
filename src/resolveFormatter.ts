import * as fs from "node:fs/promises";

import { Formatter, formatters } from "./formatters.js";
import { findNearestPackageJson } from "./utils.js";

export async function resolveFormatter(
	cwd = ".",
): Promise<Formatter | undefined> {
	const children = await fs.readdir(cwd);

	for (const child of children) {
		for (const formatter of formatters) {
			if (formatter.testers.configFile.test(child)) {
				return formatter;
			}
		}
	}

	const packageJson = await findNearestPackageJson(cwd);
	if (!packageJson) {
		return undefined;
	}

	for (const script of Object.values(packageJson.scripts ?? {})) {
		for (const formatter of formatters) {
			if (formatter.testers.script.test(script as string)) {
				return formatter;
			}
		}
	}

	for (const formatter of formatters) {
		if (
			"packageKey" in formatter.testers &&
			formatter.testers.packageKey in packageJson
		) {
			return formatter;
		}
	}

	return undefined;
}
