import { describe, expect, it } from "vitest";
import { LampCalculator, LampCalculatorOptions } from "./lamp-calculator";
import { ScoreParser } from "./score-parser";

const PB_BASE = "https://ongeki-net.com/ongeki-mobile/img";
const PLAYLOG_BASE = "https://ongeki-net.com/ongeki-mobile/img";

function pbIcon(name: string): string {
	return `${PB_BASE}/${name}`;
}

function playlogIcon(name: string): string {
	return `${PLAYLOG_BASE}/${name}`;
}

describe("LampCalculator.calculate", () => {
	const cases: Array<{
		name: string;
		icons: Array<string>;
		options: LampCalculatorOptions;
		expected: { noteLamp: string; bellLamp: string };
	}> = [
		{
			name: "PB clear without FC",
			icons: [
				pbIcon("music_icon_br_great.png"),
				pbIcon("music_icon_tr_ss.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 998_888 },
			expected: { noteLamp: "CLEAR", bellLamp: "NONE" },
		},
		{
			name: "PB clear with FULL BELL and FULL COMBO",
			icons: [
				pbIcon("music_icon_br_great.png"),
				pbIcon("music_icon_tr_sssplus.png"),
				pbIcon("music_icon_fb.png"),
				pbIcon("music_icon_fc.png"),
			],
			options: { mode: "pb", score: 1_007_995 },
			expected: { noteLamp: "FULL COMBO", bellLamp: "FULL BELL" },
		},
		{
			name: "PB draw clear with 0% over-damage placeholder battle icon",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_sss.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 1_001_055, overDamagePercent: 0 },
			expected: { noteLamp: "CLEAR", bellLamp: "NONE" },
		},
		{
			name: "PB win clear with ALL BREAK",
			icons: [
				pbIcon("music_icon_br_excellent.png"),
				pbIcon("music_icon_tr_sssplus.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_ab.png"),
			],
			options: { mode: "pb", score: 1_008_768, overDamagePercent: 358.28 },
			expected: { noteLamp: "ALL BREAK", bellLamp: "NONE" },
		},
		{
			name: "PB minimum clear rank",
			icons: [
				pbIcon("music_icon_br_usually.png"),
				pbIcon("music_icon_tr_s.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 982_446, overDamagePercent: 167.72 },
			expected: { noteLamp: "CLEAR", bellLamp: "NONE" },
		},
		{
			name: "PB LOSS via 970k fallback",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_d.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 450_000, overDamagePercent: 0 },
			expected: { noteLamp: "LOSS", bellLamp: "NONE" },
		},
		{
			name: "PB LOSS from explicit lose icon without battle clear rank",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_ss.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("lose.png"),
			],
			options: { mode: "pb", score: 450_000, overDamagePercent: 0 },
			expected: { noteLamp: "LOSS", bellLamp: "NONE" },
		},
		{
			name: "PB FULL BELL guard prevents LOSS",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_ss.png"),
				pbIcon("music_icon_fb.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 500_000, overDamagePercent: 0 },
			expected: { noteLamp: "CLEAR", bellLamp: "FULL BELL" },
		},
		{
			name: "PB sub-970 clear when over-damage is positive",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_c.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 850_000, overDamagePercent: 50 },
			expected: { noteLamp: "CLEAR", bellLamp: "NONE" },
		},
		{
			name: "PB sub-970 ambiguous draw falls back to LOSS",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_bbb.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 830_000, overDamagePercent: 0 },
			expected: { noteLamp: "LOSS", bellLamp: "NONE" },
		},
		{
			name: "playlog loss from base icon in result slot",
			icons: [
				playlogIcon("music_icon_base.png"),
				playlogIcon("music_icon_base.png"),
				playlogIcon("music_icon_base.png"),
			],
			options: { mode: "playlog", score: 600_000 },
			expected: { noteLamp: "LOSS", bellLamp: "NONE" },
		},
		{
			name: "playlog clear with FULL BELL and FULL COMBO",
			icons: [
				playlogIcon("music_icon_br_clear.png"),
				playlogIcon("music_icon_fb.png"),
				playlogIcon("music_icon_fc.png"),
			],
			options: { mode: "playlog", score: 850_000 },
			expected: { noteLamp: "FULL COMBO", bellLamp: "FULL BELL" },
		},
		{
			name: "performance lamp overrides LOSS fallback",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_fc.png"),
			],
			options: { mode: "pb", score: 850_000, overDamagePercent: 0 },
			expected: { noteLamp: "FULL COMBO", bellLamp: "NONE" },
		},
	];

	for (const testCase of cases) {
		it(testCase.name, () => {
			expect(LampCalculator.calculate(testCase.icons, testCase.options)).toEqual(
				testCase.expected,
			);
		});
	}
});

describe("ScoreParser.parseOverDamagePercent", () => {
	it("parses over-damage percentages from PB score cells", () => {
		expect(ScoreParser.parseOverDamagePercent("0.00%")).toBe(0);
		expect(ScoreParser.parseOverDamagePercent("358.28%")).toBe(358.28);
		expect(ScoreParser.parseOverDamagePercent(undefined)).toBeUndefined();
	});
});

describe("ScoreParser.parsePersonalBestScore", () => {
	it("classifies 0% OD draw clears from ONGEKI NET PB HTML", () => {
		const html = `
			<form>
				<div class="music_label p_5 break">夢を叶える場所</div>
				<table class="score_table expert_score_table t_r clearfix">
					<tr>
						<td class="score_value expert_score_value">0.00%</td>
						<td class="score_value expert_score_value">9,322,134</td>
						<td class="score_value expert_score_value">1,001,055</td>
					</tr>
				</table>
				<div class="music_score_icon_area t_r f_0">
					<img src="https://ongeki-net.com/ongeki-mobile/img/music_icon_back.png">
					<img src="https://ongeki-net.com/ongeki-mobile/img/music_icon_tr_sss.png">
					<img src="https://ongeki-net.com/ongeki-mobile/img/music_icon_back.png">
					<img src="https://ongeki-net.com/ongeki-mobile/img/music_icon_back.png">
				</div>
				<div class="t_r platinum_high_score_text_block">1,775 / 2,000</div>
			</form>
		`;

		const element = new DOMParser().parseFromString(html, "text/html").body
			.firstElementChild as HTMLElement;

		expect(
			ScoreParser.parsePersonalBestScore(
				element,
				"EXPERT",
				"768",
				"inGameID",
			),
		).toMatchObject({
			score: 1_001_055,
			noteLamp: "CLEAR",
			bellLamp: "NONE",
			platinumScore: 1775,
		});
	});
});
