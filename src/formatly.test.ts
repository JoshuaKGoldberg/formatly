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

const mockResolveFormatter = vi.fn();

vi.mock("./resolveFormatter.js", () => ({
	get resolveFormatter() {
		return mockResolveFormatter;
	},
}));

const patterns = ["*"];

describe("formatly", () => {
	it("resolves with a report error when no patterns are provided", async () => {
		const report = await formatly([" "]);

		expect(report).toEqual({
			message: "No file patterns were provided to formatly.",
			ran: false,
		});
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it("resolves with a report error when a formatter cannot be found", async () => {
		mockResolveFormatter.mockResolvedValueOnce(undefined);

		const report = await formatly(patterns);

		expect(report).toEqual({
			message: "Could not detect a reporter.",
			ran: false,
		});
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it("resolves with a result when a formatter can be found", async () => {
		const mockFormatter = formatters[0];
		mockResolveFormatter.mockResolvedValueOnce(mockFormatter);

		const report = await formatly(patterns);

		expect(report).toEqual({
			formatter: mockFormatter,
			ran: true,
			result: { code: 0, signal: null },
		});
	});

	it("resolves with the result code when an explicit formatter is passed", async () => {
		const mockFormatter = formatters[0];

		const report = await formatly(patterns, { formatter: mockFormatter.name });

		expect(report).toEqual({
			formatter: mockFormatter,
			ran: true,
			result: { code: 0, signal: null },
		});
	});

	it("uses provided cwd to resolve formatter and spawn process", async () => {
		const cwd = "custom";
		const mockFormatter = formatters[0];
		mockResolveFormatter.mockResolvedValueOnce(mockFormatter);

		await formatly(patterns, { cwd });

		expect(mockResolveFormatter).toHaveBeenCalledWith(cwd);

		expect(mockSpawn).toHaveBeenCalledWith(
			"npx",
			["@biomejs/biome", "format", "--write", ...patterns],
			{ cwd },
		);
	});
});
