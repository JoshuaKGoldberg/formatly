import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { format } from "./format.js";
import { formatters } from "./formatters/all.js";
import { FormatterName } from "./types.js";

const mockResolveFormatter = vi.fn();

vi.mock("./resolveFormatter.js", () => ({
	get resolveFormatter() {
		return mockResolveFormatter;
	},
}));

// all.ts reads formatTextPrettier as it's imported, so the mock is hoisted
const mockFormatTextPrettier = vi.hoisted(() => vi.fn());

vi.mock("./formatters/formatTextPrettier.js", () => ({
	formatTextPrettier: mockFormatTextPrettier,
}));

const filePath = "index.ts";
const text = "const a   =  1";

const [, , , , prettier] = formatters;

describe("format", () => {
	it("resolves with a report error when no file path is provided", async () => {
		const report = await format(text, { filePath: " " });

		expect(report).toEqual({
			message: "No file path was provided to format.",
			ran: false,
		});
		expect(mockResolveFormatter).not.toHaveBeenCalled();
	});

	it("resolves with a report error when a formatter cannot be found", async () => {
		mockResolveFormatter.mockResolvedValueOnce(undefined);

		const report = await format(text, { filePath });

		expect(report).toEqual({
			message: "Could not detect a formatter.",
			ran: false,
		});
		expect(mockFormatTextPrettier).not.toHaveBeenCalled();
	});

	it("resolves with the formatted text when the resolved formatter succeeds", async () => {
		const formatted = "const a = 1;\n";
		mockResolveFormatter.mockResolvedValueOnce(prettier);
		mockFormatTextPrettier.mockResolvedValueOnce({ formatted });

		const report = await format(text, { filePath });

		expect(report).toEqual({
			formatted,
			formatter: prettier,
			ran: true,
		});
		expect(mockFormatTextPrettier).toHaveBeenCalledWith({
			cwd: process.cwd(),
			filePath: path.resolve(filePath),
			text,
		});
	});

	it("resolves with the error when the resolved formatter fails", async () => {
		const error = new Error("Oh no!");
		mockResolveFormatter.mockResolvedValueOnce(prettier);
		mockFormatTextPrettier.mockResolvedValueOnce({ error });

		const report = await format(text, { filePath });

		expect(report).toEqual({
			error,
			formatter: prettier,
			ran: true,
		});
	});

	it("resolves the file path against cwd when an explicit formatter is passed", async () => {
		const cwd = "custom";
		const formatted = "const a = 1;\n";
		mockFormatTextPrettier.mockResolvedValueOnce({ formatted });

		const report = await format(text, {
			cwd,
			filePath,
			formatter: prettier.name,
		});

		expect(report).toEqual({
			formatted,
			formatter: prettier,
			ran: true,
		});
		expect(mockResolveFormatter).not.toHaveBeenCalled();
		expect(mockFormatTextPrettier).toHaveBeenCalledWith({
			cwd,
			filePath: path.resolve(cwd, filePath),
			text,
		});
	});

	it("passes order and stopDirectory to resolveFormatter when provided", async () => {
		const order: FormatterName[] = ["prettier"];
		const stopDirectory = "custom";
		mockResolveFormatter.mockResolvedValueOnce(prettier);
		mockFormatTextPrettier.mockResolvedValueOnce({ formatted: text });

		await format(text, { filePath, order, stopDirectory });

		expect(mockResolveFormatter).toHaveBeenCalledWith(process.cwd(), {
			order,
			stopDirectory,
		});
	});
});
