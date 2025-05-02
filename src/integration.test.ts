import { describe, expect, it, vi } from "vitest";

import { formatly } from "./formatly.js";
import { formatters } from "./formatters.js";

const mockSpawn = vi.fn(() => ({
	on: (
		name: string,
		cb: (code: null | number, signal: NodeJS.Signals | null) => void,
	) => {
		if (name === "exit") {
			cb(0, null);
		}
	},
}));

vi.mock("node:child_process", () => ({
	get spawn() {
		return mockSpawn;
	},
}));

const mockReaddir = vi.fn();

vi.mock("node:fs/promises", () => ({
	get readdir() {
		return mockReaddir;
	},
}));

const patterns = ["*"];

describe("formatly + resolveFormatter", () => {
	it("detects formatter in provided cwd and runs formatter in that cwd", async () => {
		mockReaddir.mockResolvedValueOnce(["deno.json"]);

		const cwd = "custom";

		const report = await formatly(patterns, { cwd });

		expect(report).toEqual({
			formatter: formatters[1],
			ran: true,
			result: { code: 0, signal: null },
		});

		expect(mockSpawn).toHaveBeenCalledWith("deno", ["fmt", ...patterns], {
			cwd,
		});
	});
});
