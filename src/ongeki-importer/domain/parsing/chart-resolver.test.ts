import { describe, expect, it } from "vitest";
import {
	ChartLookups,
	ChartResolver,
	chartResolver,
	generatedChartLookups,
} from "./chart-resolver";
import { ParseError } from "../models/errors";

const FIXTURE_LOOKUPS: ChartLookups = {
	remasterByTitle: { "Fixture Remaster": "8187" },
	remasterSongTitleOnly: ["Fixture Title Only"],
	lunaticByTitle: { "Fixture Lunatic": "8188" },
};

const resolver = new ChartResolver(FIXTURE_LOOKUPS);

function parseHtml(html: string): HTMLElement {
	const doc = new DOMParser().parseFromString(html, "text/html");
	return doc.body;
}

describe("ChartResolver.resolveChart", () => {
	it("maps Re:MASTER charts with inGameID as LUNATIC for Tachi import", () => {
		expect(resolver.resolveChart("Fixture Remaster", "LUNATIC")).toEqual({
			identifier: "8187",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("maps Re:MASTER charts without inGameID via songTitle", () => {
		expect(resolver.resolveChart("Fixture Title Only", "LUNATIC")).toEqual({
			identifier: "Fixture Title Only",
			matchType: "songTitle",
			difficulty: "LUNATIC",
		});
	});

	it("prefers remaster inGameID when a title appears in several tables", () => {
		const ambiguous = new ChartResolver({
			remasterByTitle: { "Fixture Ambiguous": "8189" },
			remasterSongTitleOnly: ["Fixture Ambiguous"],
			lunaticByTitle: { "Fixture Ambiguous": "9999" },
		});

		expect(ambiguous.resolveChart("Fixture Ambiguous", "LUNATIC")).toEqual({
			identifier: "8189",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("maps LUNATIC charts by inGameID", () => {
		expect(resolver.resolveChart("Fixture Lunatic", "LUNATIC")).toEqual({
			identifier: "8188",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("falls back to songTitle + LUNATIC for unknown lunatic-tab titles", () => {
		expect(resolver.resolveChart("Unknown Song Title", "LUNATIC")).toEqual({
			identifier: "Unknown Song Title",
			matchType: "songTitle",
			difficulty: "LUNATIC",
		});
	});

	it("ignores the lookup tables for non-lunatic difficulties", () => {
		expect(resolver.resolveChart("Fixture Remaster", "MASTER")).toEqual({
			identifier: "Fixture Remaster",
			matchType: "songTitle",
			difficulty: "MASTER",
		});
	});

	it("disambiguates Singularity via jacket image hash", () => {
		const doc = parseHtml(
			`<img class="m_5 f_l" src="https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png">`,
		);

		expect(resolver.resolveChart("Singularity", "MASTER", doc)).toEqual({
			identifier: "454",
			matchType: "inGameID",
			difficulty: "MASTER",
		});
	});

	it("disambiguates Perfect Shining loctest chart", () => {
		const doc = parseHtml(`<div>星咲 あかり Lv.1</div>`);

		expect(resolver.resolveChart("Perfect Shining!!", "LUNATIC", doc)).toEqual({
			identifier: "8003",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("disambiguates Perfect Shining white chart as LUNATIC for Tachi import", () => {
		const doc = parseHtml(`<div>星咲 あかり Lv.39</div>`);

		expect(resolver.resolveChart("Perfect Shining!!", "LUNATIC", doc)).toEqual({
			identifier: "8091",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("disambiguates Hand in Hand livetune variant", () => {
		const doc = parseHtml(`<motion>livetune</motion>`);

		expect(resolver.resolveChart("Hand in Hand", "MASTER", doc)).toEqual({
			identifier: "380",
			matchType: "inGameID",
			difficulty: "MASTER",
		});
	});

	it("disambiguates Hand in Hand anime variant", () => {
		const doc = parseHtml(
			`<div>ユーフィリア(CV：高橋 李依)「アンジュ・ヴィエルジュ」</div>`,
		);

		expect(resolver.resolveChart("Hand in Hand", "MASTER", doc)).toEqual({
			identifier: "212",
			matchType: "inGameID",
			difficulty: "MASTER",
		});
	});

	it("requires detail document for disambiguated titles", () => {
		expect(() => resolver.resolveChart("Singularity", "MASTER")).toThrow(
			ParseError,
		);
	});
});

describe("ChartResolver.needsDetail", () => {
	it("returns true for titles requiring detail disambiguation", () => {
		expect(resolver.needsDetail("Singularity")).toBe(true);
		expect(resolver.needsDetail("Perfect Shining!!")).toBe(true);
		expect(resolver.needsDetail("Hand in Hand")).toBe(true);
		expect(resolver.needsDetail("WakeUP MakeUP FEVER!")).toBe(false);
	});
});

describe("chartResolver", () => {
	it("is wired to the generated lookup tables", () => {
		const [[title, inGameID]] = Object.entries(
			generatedChartLookups.remasterByTitle,
		);
		expect(inGameID).toBeTruthy();

		expect(chartResolver.resolveChart(title, "LUNATIC")).toEqual({
			identifier: inGameID,
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});
});
