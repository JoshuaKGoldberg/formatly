import { describe, expect, it, vi } from "vitest";

import { formatly } from "./formatly.js";
import { formatters } from "./formatters.js";

const mockExeca = vi.fn();

vi.mock("execa", () => ({
	get execa() {
		return mockExeca;
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
		expect(mockExeca).not.toHaveBeenCalled();
	});

	it("resolves with a report error when a formatter cannot be found", async () => {
		mockResolveFormatter.mockResolvedValueOnce(undefined);

		const report = await formatly(patterns);

		expect(report).toEqual({
			message: "Could not detect a reporter.",
			ran: false,
		});
		expect(mockExeca).not.toHaveBeenCalled();
	});

	it("resolves with the result from calling execa when a formatter can be found", async () => {
		const mockResult = { code: 0, stderr: "", stdout: "🧹" };
		const mockFormatter = formatters[0];
		mockResolveFormatter.mockResolvedValueOnce(mockFormatter);
		mockExeca.mockResolvedValueOnce(mockResult);

		const report = await formatly(patterns);

		expect(report).toEqual({
			formatter: mockFormatter,
			ran: true,
			result: mockResult,
		});
	});

	it("resolves with the result from calling execa when an explicit formatter is passed", async () => {
		const mockResult = { code: 0, stderr: "", stdout: "🧹" };
		const mockFormatter = formatters[0];
		mockExeca.mockResolvedValueOnce(mockResult);

		const report = await formatly(patterns, { formatter: mockFormatter.name });

		expect(report).toEqual({
			formatter: mockFormatter,
			ran: true,
			result: mockResult,
		});
	});
});
