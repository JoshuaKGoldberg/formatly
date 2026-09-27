export function limitConcurrency<Args extends unknown[], Result>(
	task: (...args: Args) => Promise<Result>,
	maximum: number,
) {
	const waiting: (() => void)[] = [];
	let running = 0;

	return async (...args: Args) => {
		if (running < maximum) {
			running += 1;
		} else {
			await new Promise<void>((resolve) => waiting.push(resolve));
		}

		try {
			return await task(...args);
		} finally {
			const next = waiting.shift();

			if (next) {
				next();
			} else {
				running -= 1;
			}
		}
	};
}
