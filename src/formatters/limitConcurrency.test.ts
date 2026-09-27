import { describe, expect, it } from "vitest";

import { limitConcurrency } from "./limitConcurrency.js";

function createDeferredTasks(count: number) {
	const resolvers: (() => void)[] = [];
	const started: number[] = [];

	const limited = limitConcurrency(async (index: number) => {
		started.push(index);
		await new Promise<void>((resolve) => resolvers.push(resolve));
		return index;
	}, 2);

	const results = Array.from({ length: count }, (_, index) => limited(index));

	return { resolvers, results, started };
}

async function flush() {
	await new Promise((resolve) => setImmediate(resolve));
}

describe("limitConcurrency", () => {
	it("runs no more than the maximum tasks at once", async () => {
		const { resolvers, results, started } = createDeferredTasks(4);

		await flush();
		expect(started).toEqual([0, 1]);

		resolvers[0]();
		await flush();
		expect(started).toEqual([0, 1, 2]);

		resolvers[1]();
		resolvers[2]();
		await flush();
		resolvers[3]();

		expect(await Promise.all(results)).toEqual([0, 1, 2, 3]);
	});

	it("starts the next task when a running task rejects", async () => {
		const limited = limitConcurrency(async (shouldReject: boolean) => {
			await Promise.resolve();
			if (shouldReject) {
				throw new Error("Oops");
			}
			return "ok";
		}, 1);

		const rejected = limited(true);
		const resolved = limited(false);

		await expect(rejected).rejects.toThrow("Oops");
		expect(await resolved).toBe("ok");
	});
});
