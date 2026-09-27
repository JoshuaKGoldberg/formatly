export interface FormatFilesOptions extends Omit<FormatlyOptions, "dryRun"> {
	/**
	 * Whether to report which files aren't formatted instead of formatting them.
	 */
	check?: boolean;
}

export type FormatFilesReport =
	FormatFilesReportFailure | FormatFilesReportResult | FormatlyReportError;

export interface FormatFilesReportFailure extends FormatFilesResultError {
	formatter: Formatter;
	ran: true;
}

export interface FormatFilesReportResult extends FormatFilesResultChanged {
	formatter: Formatter;
	ran: true;
}

export type FormatFilesResult =
	FormatFilesResultChanged | FormatFilesResultError;

export interface FormatFilesResultChanged {
	changed: string[];
	error?: never;
}

export interface FormatFilesResultError {
	changed?: never;
	error: Error;
}

export interface FormatlyOptions extends ResolveFormatterOptions {
	cwd?: string;

	/**
	 * Whether to report what would run instead of formatting anything.
	 */
	dryRun?: boolean;

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

/**
 * The command a formatter would have spawned, when run with dryRun.
 */
export interface FormatlyReportDryRunResult {
	args: string[];
	command: string;
	runner: "dry-run";
}

export interface FormatlyReportError {
	message: string;
	ran: false;
}

export interface FormatlyReportResult {
	formatter: Formatter;
	ran: true;
	result:
		| FormatlyReportChildProcessResult
		| FormatlyReportDryRunResult
		| FormatlyReportVirtualResult;
}

export interface FormatlyReportVirtualResult {
	/**
	 * Exit code the formatter would have exited with as a process.
	 */
	code: number;
	runner: "virtual";
}

export interface FormatOptions extends Omit<FormatlyOptions, "dryRun"> {
	/**
	 * Path the text should be treated as being at, relative to cwd.
	 * Formatters use it to infer the parser and apply per-path config overrides.
	 */
	filePath: string;
}

export type FormatReport =
	FormatlyReportError | FormatReportFailure | FormatReportResult;

export interface FormatReportFailure extends FormatTextResultError {
	formatter: Formatter;
	ran: true;
}

export interface FormatReportResult extends FormatTextResultFormatted {
	formatter: Formatter;
	ran: true;
}

export interface Formatter {
	checker: FormatterChecker;
	formatText: FormatterTextRunner;
	name: FormatterName;
	runner: FormatterRunner;
	testers: {
		configFile: RegExp;
		packageKey?: string;
		script: RegExp;
	};
}

export type FormatterChecker = (
	options: FormatterCheckerOptions,
) => Promise<FormatFilesResult>;

export interface FormatterCheckerOptions {
	cwd: string;

	/**
	 * Absolute paths of the files to check.
	 */
	filePaths: string[];
}

export type FormatterName = "biome" | "deno" | "dprint" | "oxfmt" | "prettier";

export type FormatterRunner = (
	options: FormatterRunnerOptions,
) => Promise<
	| FormatlyReportChildProcessResult
	| FormatlyReportDryRunResult
	| FormatlyReportVirtualResult
>;

export interface FormatterRunnerOptions {
	cwd: string;

	/**
	 * Whether to resolve the command that would run without spawning it.
	 */
	dryRun?: boolean;
	patterns: string[];
}

export type FormatterTextRunner = (
	options: FormatterTextRunnerOptions,
) => Promise<FormatTextResult>;

export interface FormatterTextRunnerOptions {
	cwd: string;

	/**
	 * Absolute path the text should be treated as being at.
	 */
	filePath: string;
	text: string;
}

export type FormatTextResult =
	FormatTextResultError | FormatTextResultFormatted;

export interface FormatTextResultError {
	error: Error;
	formatted?: never;
}

export interface FormatTextResultFormatted {
	error?: never;
	formatted: string;
}

export interface ResolveFormatterOptions {
	/**
	 * Formatter names to detect in order, before any formatters not listed.
	 * Unlisted formatters are then detected in their default order.
	 */
	order?: FormatterName[];

	/**
	 * Directory to stop searching parent directories for a config file at.
	 * If not provided, only the working directory is searched.
	 */
	stopDirectory?: StopDirectory;
}

export type StopDirectory = ((currentDirectory: string) => boolean) | string;
