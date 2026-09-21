import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { cli } from "./cli.js";

const mockFormatly = vi.fn();

vi.mock("./formatly.js", () => ({
	get formatly() {
		return mockFormatly;
	},
}));

const mockError = vi.fn();
const mockLog = vi.fn();

const patterns = ["*"];

describe("cli", () => {
	beforeEach(() => {
		console.error = mockError;
		console.log = mockLog;
	});

	it("returns 0 and logs the formatter name when formatly runs", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: { code: 0, runner: "child_process", signal: null },
		});

		const result = await cli(patterns);

		expect(result).toBe(0);
		expect(mockFormatly).toHaveBeenCalledWith(patterns, { dryRun: false });
		expect(mockLog).toHaveBeenCalledWith("Formatted with prettier. 🧼");
		expect(mockError).not.toHaveBeenCalled();
	});

	it("returns 0 and logs the formatter and command without formatting when --dry-run is passed", async () => {
		mockFormatly.mockResolvedValueOnce({
			formatter: { name: "prettier" },
			ran: true,
			result: {
				args: ["exec", "prettier", "--write", ...patterns],
				command: "pnpm",
				runner: "dry-run",
			},
		});

		const result = await cli(["--dry-run", ...patterns]);

		expect(result).toBe(0);
		expect(mockFormatly).toHaveBeenCalledWith(patterns, { dryRun: true });
		expect(mockLog.mock.calls).toEqual([
			["Detected prettier. 🔍"],
			["Would run: pnpm exec prettier --write *"],
		]);
		expect(mockError).not.toHaveBeenCalled();
	});

	it("returns 1 and logs an error when formatly does not run", async () => {
		const message = "Oh no!";
		mockFormatly.mockResolvedValueOnce({ message, ran: false });

		const result = await cli(patterns);

		expect(result).toBe(1);
		expect(mockError).toHaveBeenCalledWith(message);
		expect(mockLog).not.toHaveBeenCalled();
	});
});
