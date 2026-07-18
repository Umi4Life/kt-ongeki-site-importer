import { describe, expect, it } from "vitest";
import { ChartResolver } from "./chart-resolver";
import { ParseError } from "../models/errors";

function parseHtml(html: string): HTMLElement {
	const doc = new DOMParser().parseFromString(html, "text/html");
	return doc.body;
}

describe("ChartResolver.resolveChart", () => {
	it("maps Re:MASTER white charts with inGameID", () => {
		expect(ChartResolver.resolveChart("WakeUP MakeUP FEVER!", "LUNATIC")).toEqual({
			identifier: "8187",
			matchType: "inGameID",
			difficulty: "Re:MASTER",
		});
	});

	it("maps ブツメツビーターズ via songTitle + Re:MASTER when inGameID is null", () => {
		expect(ChartResolver.resolveChart("ブツメツビーターズ", "LUNATIC")).toEqual({
			identifier: "ブツメツビーターズ",
			matchType: "songTitle",
			difficulty: "Re:MASTER",
		});
	});

	it("maps extra LUNATIC charts by inGameID", () => {
		expect(ChartResolver.resolveChart("わたしたち魔法乙女です☆", "LUNATIC")).toEqual({
			identifier: "8188",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("falls back to songTitle + LUNATIC for unknown lunatic-tab titles", () => {
		expect(ChartResolver.resolveChart("Unknown Song Title", "LUNATIC")).toEqual({
			identifier: "Unknown Song Title",
			matchType: "songTitle",
			difficulty: "LUNATIC",
		});
	});

	it("uses songTitle for non-lunatic difficulties by default", () => {
		expect(ChartResolver.resolveChart("Some Song", "MASTER")).toEqual({
			identifier: "Some Song",
			matchType: "songTitle",
			difficulty: "MASTER",
		});
	});

	it("disambiguates Singularity via jacket image hash", () => {
		const doc = parseHtml(
			`<img class="m_5 f_l" src="https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png">`,
		);

		expect(
			ChartResolver.resolveChart("Singularity", "MASTER", doc),
		).toEqual({
			identifier: "454",
			matchType: "inGameID",
			difficulty: "MASTER",
		});
	});

	it("disambiguates Perfect Shining loctest chart", () => {
		const doc = parseHtml(`<div>星咲 あかり Lv.1</div>`);

		expect(
			ChartResolver.resolveChart("Perfect Shining!!", "LUNATIC", doc),
		).toEqual({
			identifier: "8003",
			matchType: "inGameID",
			difficulty: "LUNATIC",
		});
	});

	it("disambiguates Perfect Shining Re:MASTER chart", () => {
		const doc = parseHtml(`<div>星咲 あかり Lv.39</div>`);

		expect(
			ChartResolver.resolveChart("Perfect Shining!!", "LUNATIC", doc),
		).toEqual({
			identifier: "8091",
			matchType: "inGameID",
			difficulty: "Re:MASTER",
		});
	});

	it("disambiguates Hand in Hand livetune variant", () => {
		const doc = parseHtml(`<motion>livetune</motion>`);

		expect(
			ChartResolver.resolveChart("Hand in Hand", "MASTER", doc),
		).toEqual({
			identifier: "380",
			matchType: "inGameID",
			difficulty: "MASTER",
		});
	});

	it("disambiguates Hand in Hand anime variant", () => {
		const doc = parseHtml(`<div>ユーフィリア(CV：高橋 李依)「アンジュ・ヴィエルジュ」</div>`);

		expect(
			ChartResolver.resolveChart("Hand in Hand", "MASTER", doc),
		).toEqual({
			identifier: "212",
			matchType: "inGameID",
			difficulty: "MASTER",
		});
	});

	it("requires detail document for disambiguated titles", () => {
		expect(() => ChartResolver.resolveChart("Singularity", "MASTER")).toThrow(
			ParseError,
		);
	});
});

describe("ChartResolver.needsDetail", () => {
	it("returns true for titles requiring detail disambiguation", () => {
		expect(ChartResolver.needsDetail("Singularity")).toBe(true);
		expect(ChartResolver.needsDetail("Perfect Shining!!")).toBe(true);
		expect(ChartResolver.needsDetail("Hand in Hand")).toBe(true);
		expect(ChartResolver.needsDetail("WakeUP MakeUP FEVER!")).toBe(false);
	});
});
