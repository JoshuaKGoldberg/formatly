import type { ResolvedCommand } from "package-manager-detector";

import { FormatterRunner, FormatterTextRunner } from "../types.js";
import {
	FormatTextPackageCommand,
	PackageCommand,
	runFormatterCommand,
	runPackageFormatterCommand,
	runPackageFormatterTextCommand,
} from "./runFormatterCommand.js";

export function createFormatTextPackageCommand(
	command: FormatTextPackageCommand,
): FormatterTextRunner {
	return async (options) =>
		await runPackageFormatterTextCommand(command, options);
}

export function createRunCommand(command: ResolvedCommand): FormatterRunner {
	return async (options) => await runFormatterCommand(command, options);
}

export function createRunPackageCommand(
	command: PackageCommand,
): FormatterRunner {
	return async (options) => await runPackageFormatterCommand(command, options);
}
