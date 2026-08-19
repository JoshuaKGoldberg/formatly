export interface FormatlyOptions extends ResolveFormatterOptions {
	cwd?: string;

	/**
	 * Pass an explicitly formatter to use instead of automatically detecting
	 */
	formatter?: FormatterName;
}

export type FormatlyReport = FormatlyReportError | FormatlyReportResult;

export interface FormatlyReportChildProcessResult {
	code: null | number;
	runner: "child_process";
	signal: NodeJS.Signals | null;
}

export interface FormatlyReportError {
	message: string;
	ran: false;
}

export interface FormatlyReportResult {
	formatter: Formatter;
	ran: true;
	result: FormatlyReportChildProcessResult | FormatlyReportVirtualResult;
}

export interface FormatlyReportVirtualResult {
	runner: "virtual";
}

export interface Formatter {
	name: FormatterName;
	runner: FormatterRunner;
	testers: {
		configFile: RegExp;
		packageKey?: string;
		script: RegExp;
	};
}

export type FormatterName = "biome" | "deno" | "dprint" | "oxfmt" | "prettier";

export type FormatterRunner = (
	options: FormatterRunnerOptions,
) => Promise<FormatlyReportChildProcessResult | FormatlyReportVirtualResult>;

export interface FormatterRunnerOptions {
	cwd: string;
	patterns: string[];
}

export interface ResolveFormatterOptions {
	/**
	 * Directory to stop searching parent directories for a config file at.
	 * If not provided, only the working directory is searched.
	 */
	stopDirectory?: StopDirectory;
}

export type StopDirectory = ((currentDirectory: string) => boolean) | string;
