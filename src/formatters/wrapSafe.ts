export function wrapSafe<T>(task: () => T) {
	try {
		return task();
	} catch {
		return undefined;
	}
}
