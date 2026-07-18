import path from "node:path";
import fs from "node:fs";
import { buildSync } from "esbuild";

const originalResolve = path.resolve;
path.resolve = (...args) => {
	const resolved = originalResolve(...args);
	if (resolved.includes("index.user")) {
		return resolved.replaceAll("\\", "/");
	}
	return resolved;
};

const { build } = await import("bundlemonkey");

console.log("Bundlemonkey started in production mode\n");
await build({});

const bundledUserScript = "./docs/ongeki-importer.user.js";
const renamedUserScript = "./docs/kt-ongeki-site-importer.user.js";

if (fs.existsSync(bundledUserScript)) {
	fs.renameSync(bundledUserScript, renamedUserScript);
}

buildSync({
	entryPoints: [renamedUserScript],
	minify: true,
	outfile: "./docs/kt-ongeki-site-importer.min.js",
	allowOverwrite: true,
});

fs.copyFileSync("./README.md", "./docs/README.md");
