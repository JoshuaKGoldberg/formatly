import type { ResolvedCommand } from "package-manager-detector";

import { FormatterRunner } from "../types.js";
import {
	runFormatterCommand,
	runPackageFormatterCommand,
} from "./runFormatterCommand.js";

export function createRunCommand(command: ResolvedCommand): FormatterRunner {
	return async (options) => await runFormatterCommand(command, options);
}

export function createRunPackageCommand(
	command: ResolvedCommand,
): FormatterRunner {
	return async (options) => await runPackageFormatterCommand(command, options);
}
