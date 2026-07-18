import { defineUserScript } from "bundlemonkey";
import { createAppContext } from "./app/bootstrap";
import { route } from "./app/router";

import pkg from "../../package.json";

export default defineUserScript({
	name: "kt-ongeki-site-importer",
	version: pkg.version,
	grant: ["GM.xmlHttpRequest"],
	connect: ["kamaitachi.xyz", "kamai.tachi.ac"],
	author: "umi4life",
	include: ["https://ongeki-net.com/ongeki-mobile/*"],
	require: ["https://cdn.jsdelivr.net/npm/@trim21/gm-fetch"],
	main: () => {
		console.log("kt-ongeki-site-importer loaded");
		console.log("running ongeki import script on ", location.href);

		const ctx = createAppContext();
		route(ctx);
	},
});
