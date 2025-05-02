import { FormatterRunner } from "../types.js";
import { runFormatterCommand } from "./runFormatterCommand.js";

export function createRunCommand(runner: string): FormatterRunner {
	return async (options) => await runFormatterCommand(runner, options);
}
