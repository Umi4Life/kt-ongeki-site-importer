import { describe, expect, it } from "vitest";
import { LampCalculator, LampCalculatorOptions } from "./lamp-calculator";

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
			name: "PB loss from missing battle rank badge",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_tr_d.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 450_000 },
			expected: { noteLamp: "LOSS", bellLamp: "NONE" },
		},
		{
			name: "PB loss from explicit lose icon",
			icons: [
				pbIcon("music_icon_br_great.png"),
				pbIcon("music_icon_tr_ss.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("lose.png"),
			],
			options: { mode: "pb", score: 999_999 },
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
			options: { mode: "pb", score: 500_000 },
			expected: { noteLamp: "CLEAR", bellLamp: "FULL BELL" },
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
			name: "ambiguous PB high score defaults to CLEAR",
			icons: [
				pbIcon("music_icon_br_great.png"),
				pbIcon("music_icon_tr_ss.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 980_000 },
			expected: { noteLamp: "CLEAR", bellLamp: "NONE" },
		},
		{
			name: "ambiguous PB low score falls back to LOSS",
			icons: [
				pbIcon("music_icon_br_great.png"),
				pbIcon("music_icon_tr_ss.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
			],
			options: { mode: "pb", score: 850_000 },
			expected: { noteLamp: "LOSS", bellLamp: "NONE" },
		},
		{
			name: "performance lamp overrides LOSS fallback",
			icons: [
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_back.png"),
				pbIcon("music_icon_fc.png"),
			],
			options: { mode: "pb", score: 850_000 },
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
