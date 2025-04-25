import { findPackage } from "fd-package-json";
import * as fs from "node:fs/promises";

import { Formatter, formatters } from "./formatters.js";

export async function resolveFormatter(
	cwd: string,
): Promise<Formatter | undefined> {
	const children = await fs.readdir(cwd);

	for (const child of children) {
		for (const formatter of formatters) {
			if (formatter.testers.configFile.test(child)) {
				return formatter;
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
