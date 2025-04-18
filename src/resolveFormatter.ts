import { findPackage } from "fd-package-json";
import * as fs from "node:fs/promises";

import { Formatter, FormatterName, formatters } from "./formatters.js";

export async function resolveFormatter(
	cwd = ".",
	order?: FormatterName[],
): Promise<Formatter | undefined> {
	const orderedFormatters =
		order == null
			? formatters
			: (order
					.map((name) => formatters.find((f) => f.name === name))
					.filter(Boolean) as typeof formatters);

	const children = await fs.readdir(cwd);

	for (const formatter of orderedFormatters) {
		if (children.some((child) => formatter.testers.configFile.test(child))) {
			return formatter;
		}
	}

	const packageData = await findPackage(cwd);
	if (!packageData) {
		return undefined;
	}

	const { scripts = {}, ...otherKeys } = packageData;
	const scriptValues = Object.values(scripts as Record<string, string>);

	for (const formatter of orderedFormatters) {
		if (scriptValues.some((script) => formatter.testers.script.test(script))) {
			return formatter;
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
