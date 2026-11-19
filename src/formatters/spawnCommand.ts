import { spawn } from "node:child_process";
import { normalizeSpawnCommand } from "tinyexec";

/**
 * Spawns a command the way Node's spawn does, except that Windows commands
 * such as npx that are .cmd shims are run through an escaped cmd.exe call.
 * Node can't spawn those shims directly without a shell.
 * Only spawn's (command, args, options) form is supported.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/675
 */
export const spawnCommand = ((
	command: string,
	args: readonly string[],
	options: Parameters<typeof normalizeSpawnCommand>[2],
) => {
	const normalized = normalizeSpawnCommand(command, args, options);

	return spawn(normalized.command, normalized.args, normalized.options);
}) as typeof spawn;
