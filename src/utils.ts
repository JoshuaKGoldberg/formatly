import fs from "node:fs/promises";
import path from "node:path";

export async function findNearestPackageJson(
	cwd = ".",
): Promise<Record<string, unknown> | undefined> {
	const packageJsonPath = await findUp(cwd, "package.json");
	if (packageJsonPath) {
		const content = await fs.readFile(packageJsonPath, "utf8");
		return JSON.parse(content) as Record<string, unknown>;
	}
}

async function findUp(dir: string, file: string): Promise<string | undefined> {
	dir = path.resolve(dir);

	while (dir) {
		const filePath = path.join(dir, file);
		try {
			const stat = await fs.stat(filePath);
			if (stat.isFile()) {
				return filePath;
			}
		} catch {
			// Ignore stat error, assuming file does not exist
		}
		const nextDir = path.dirname(dir);
		if (nextDir === dir) {
			break;
		}
		dir = nextDir;
	}
}
