import type { ResolvedCommand } from "package-manager-detector";

import { FormatterRunner, FormatterTextRunner } from "../types.js";
import {
	FormatTextCommand,
	runFormatterCommand,
	runFormatterTextCommand,
	runPackageFormatterCommand,
	runPackageFormatterTextCommand,
} from "./runFormatterCommand.js";

export function createFormatTextCommand(
	command: FormatTextCommand,
): FormatterTextRunner {
	return async (options) => await runFormatterTextCommand(command, options);
}

export function createFormatTextPackageCommand(
	command: FormatTextCommand,
): FormatterTextRunner {
	return async (options) =>
		await runPackageFormatterTextCommand(command, options);
}

export function createRunCommand(command: ResolvedCommand): FormatterRunner {
	return async (options) => await runFormatterCommand(command, options);
}

export function createRunPackageCommand(
	command: ResolvedCommand,
): FormatterRunner {
	return async (options) => await runPackageFormatterCommand(command, options);
}
