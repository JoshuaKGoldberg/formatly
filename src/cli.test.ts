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
		});

		const result = await cli(patterns);

		expect(result).toBe(0);
		expect(mockLog).toHaveBeenCalledWith("Formatted with prettier! 🧼");
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
