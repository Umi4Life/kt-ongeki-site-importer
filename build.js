import { buildSync } from "esbuild";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const userscriptHeader = 
`/* eslint-disable no-console */
/* eslint-disable camelcase */
// ==UserScript==
// @name	   kt-ongeki-site-importer
// @version    ${pkg.version}
// @grant      GM.xmlHttpRequest
// @connect    kamaitachi.xyz
// @connect    kamai.tachi.ac
// @author	   umi4life
// @include    https://ongeki-net.com/ongeki-mobile/*
// @require    https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==`;

buildSync({
	entryPoints: ["./src/ongeki-importer/index.user.ts"],
	bundle: true,
	format: "esm",
	banner: {
		js: userscriptHeader,
	},
	outfile: "./docs/kt-ongeki-site-importer.user.js",
});

buildSync({
	entryPoints: ["./src/ongeki-importer/index.user.ts"],
	minify: true,
	bundle: true,
	outfile: "./docs/kt-ongeki-site-importer.min.js",
});

fs.copyFileSync("./README.md", "./docs/README.md");
