import type { ResolvedCommand } from "package-manager-detector";

import {
	FormatterChecker,
	FormatterRunner,
	FormatterTextRunner,
} from "../types.js";
import {
	FormatCheckCommand,
	FormatCheckPackageCommand,
	FormatTextCommand,
	FormatTextPackageCommand,
	PackageCommand,
	runFormatterCheckCommand,
	runFormatterCommand,
	runFormatterTextCommand,
	runPackageFormatterCheckCommand,
	runPackageFormatterCommand,
	runPackageFormatterTextCommand,
} from "./runFormatterCommand.js";

export function createCheckCommand(
	command: FormatCheckCommand,
): FormatterChecker {
	return async (options) => await runFormatterCheckCommand(command, options);
}

export function createCheckPackageCommand(
	command: FormatCheckPackageCommand,
): FormatterChecker {
	return async (options) =>
		await runPackageFormatterCheckCommand(command, options);
}

export function createFormatTextCommand(
	command: FormatTextCommand,
): FormatterTextRunner {
	return async (options) => await runFormatterTextCommand(command, options);
}

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
