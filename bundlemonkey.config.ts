import type { Config } from "bundlemonkey";

const config: Config = {
	srcDir: "src",
	dist: {
		production: "docs",
		dev: ".dev",
	},
	defaultMeta: {
		author: "umi4life",
		namespace: "umi4life",
		homepage: "https://github.com/Umi4Life/kt-ongeki-site-importer",
		updateURL: () =>
			"https://github.com/Umi4Life/kt-ongeki-site-importer/raw/master/docs/kt-ongeki-site-importer.user.js",
		downloadURL: () =>
			"https://github.com/Umi4Life/kt-ongeki-site-importer/raw/master/docs/kt-ongeki-site-importer.user.js",
	},
};

export default config;
