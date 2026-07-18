import path from "node:path";

const originalResolve = path.resolve;
path.resolve = (...args) => {
	const resolved = originalResolve(...args);
	if (resolved.includes("index.user")) {
		return resolved.replaceAll("\\", "/");
	}
	return resolved;
};

const remote = process.argv.includes("--remote");
const { watch } = await import("bundlemonkey");

await watch({ remote });
