import type { Socket } from "node:net";

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import {
	FormatterTextRunner,
	FormatterTextRunnerOptions,
	FormatTextResult,
} from "../types.js";
import {
	resolvePackageCommand,
	runPackageFormatterTextCommand,
} from "./runFormatterCommand.js";

/**
 * @see https://github.com/dprint/dprint/blob/main/docs/editor-extension-development.md
 */
const editorServiceSchemaVersion = 5;

const messageKinds = {
	error: 1,
	formatFile: 6,
	formatFileResponse: 7,
};

const successBytes = Buffer.from([255, 255, 255, 255]);

type EditorService = (
	options: FormatterTextRunnerOptions,
) => Promise<FormatTextResult>;

const editorServices = new Map<string, Promise<EditorService | undefined>>();

function encodeMessage(id: number, kind: number, body: Buffer) {
	return Buffer.concat([
		encodeU32(id),
		encodeU32(kind),
		encodeU32(body.length),
		body,
		successBytes,
	]);
}

function encodeString(value: Buffer | string) {
	const buffer = Buffer.from(value);
	return Buffer.concat([encodeU32(buffer.length), buffer]);
}

function encodeU32(value: number) {
	const buffer = Buffer.alloc(4);
	buffer.writeUInt32BE(value);
	return buffer;
}

async function getEditorService(cwd: string) {
	let editorService = editorServices.get(cwd);

	if (!editorService) {
		editorService = startEditorService(cwd);
		editorServices.set(cwd, editorService);
	}

	return await editorService;
}

async function startEditorService(
	cwd: string,
): Promise<EditorService | undefined> {
	const info = await resolvePackageCommand(
		{ command: "dprint" },
		["editor-info"],
		cwd,
	);

	try {
		const { stdout } = await promisify(execFile)(info.command, info.args, {
			cwd,
		});
		const { schemaVersion } = JSON.parse(stdout) as { schemaVersion: number };

		if (schemaVersion !== editorServiceSchemaVersion) {
			return undefined;
		}
	} catch {
		return undefined;
	}

	const { args, command } = await resolvePackageCommand(
		{ command: "dprint" },
		["editor-service", "--parent-pid", String(process.pid)],
		cwd,
	);
	const child = spawn(command, args, {
		cwd,
		stdio: ["pipe", "pipe", "ignore"],
	});
	const pending = new Map<
		number,
		{ resolve: (result: FormatTextResult) => void; text: string }
	>();
	let buffer = Buffer.alloc(0);
	let nextId = 0;

	function updateRef() {
		for (const handle of [child, child.stdin, child.stdout] as Socket[]) {
			if (pending.size) {
				handle.ref();
			} else {
				handle.unref();
			}
		}
	}

	function stop(error: Error) {
		editorServices.delete(cwd);

		for (const { resolve } of pending.values()) {
			resolve({ error });
		}

		pending.clear();
	}

	function handleMessage(kind: number, body: Buffer) {
		if (
			kind !== messageKinds.error &&
			kind !== messageKinds.formatFileResponse
		) {
			return;
		}

		const requestId = body.readUInt32BE(0);
		const request = pending.get(requestId);

		if (!request) {
			return;
		}

		pending.delete(requestId);
		updateRef();

		request.resolve(
			kind === messageKinds.error
				? { error: new Error(body.subarray(8).toString()) }
				: {
						formatted: body.readUInt32BE(4)
							? body.subarray(12).toString()
							: request.text,
					},
		);
	}

	child.on("error", stop);
	child.on("exit", (code) => {
		stop(new Error(`dprint editor-service exited with code ${String(code)}.`));
	});
	child.stdin.on("error", () => undefined);
	child.stdout.on("data", (data: Buffer) => {
		buffer = Buffer.concat([buffer, data]);

		while (buffer.length >= 12) {
			const bodyLength = buffer.readUInt32BE(8);
			const messageLength = 12 + bodyLength + successBytes.length;

			if (buffer.length < messageLength) {
				return;
			}

			handleMessage(
				buffer.readUInt32BE(4),
				buffer.subarray(12, 12 + bodyLength),
			);
			buffer = buffer.subarray(messageLength);
		}
	});

	updateRef();

	return async ({ filePath, text }) =>
		await new Promise((resolve) => {
			const id = nextId++;
			const textBuffer = Buffer.from(text);

			pending.set(id, { resolve, text });
			updateRef();

			child.stdin.write(
				encodeMessage(
					id,
					messageKinds.formatFile,
					Buffer.concat([
						encodeString(filePath),
						encodeU32(0),
						encodeU32(textBuffer.length),
						encodeString(""),
						encodeString(textBuffer),
					]),
				),
			);
		});
}

/**
 * Formats through a long-lived dprint editor-service process per cwd, so each
 * file doesn't spawn its own dprint process.
 * @see https://github.com/JoshuaKGoldberg/formatly/issues/632
 */
export const formatTextDprint: FormatterTextRunner = async (options) => {
	const editorService = await getEditorService(options.cwd);

	return editorService
		? await editorService(options)
		: await runPackageFormatterTextCommand(
				{
					args: (filePath) => ["fmt", "--stdin", filePath],
					command: "dprint",
				},
				options,
			);
};
