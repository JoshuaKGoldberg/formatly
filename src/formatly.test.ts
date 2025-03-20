import { describe, expect, it, vi } from "vitest";

import { formatly } from "./formatly.js";
import { formatters } from "./formatters.js";

const mockSpawn = vi.fn(() => ({
	on: (name: string, cb: Function) => {
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
});
