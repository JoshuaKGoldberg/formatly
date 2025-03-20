import fs from "node:fs/promises";
import path from "node:path";

export async function findNearestPackageJson(
	cwd = ".",
): Promise<Record<string, any> | undefined> {
	const packageJsonPath = await findUp(cwd, "package.json");
	if (packageJsonPath) {
		return JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
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
		} catch {}
		const nextDir = path.dirname(dir);
		if (nextDir === dir) {
			break;
		}
		dir = nextDir;
	}
}
