import { ONGEKI_TECHNICAL_RANK_S_THRESHOLD } from "../../config/constants";
import { OngekiNoteLamp, OngekiBellLamp, LampResult } from "../models/types";

export type LampCalculatorMode = "pb" | "playlog";

export interface LampCalculatorOptions {
	mode: LampCalculatorMode;
	score: number;
	overDamagePercent?: number;
}

export class LampCalculator {
	static calculate(
		lampImages: Array<string>,
		options: LampCalculatorOptions,
	): LampResult {
		const bellSlot = options.mode === "pb" ? 2 : 1;
		const comboSlot = options.mode === "pb" ? 3 : 2;

		let bellLamp: OngekiBellLamp = "NONE";
		let noteLamp: OngekiNoteLamp = "CLEAR";

		const bellImage = lampImages[bellSlot] ?? "";
		const comboImage = lampImages[comboSlot] ?? "";

		if (bellImage.includes("fb.png")) {
			bellLamp = "FULL BELL";
		}

		if (comboImage.includes("abplus.png")) {
			noteLamp = "ALL BREAK+";
		} else if (comboImage.includes("ab.png")) {
			noteLamp = "ALL BREAK";
		} else if (comboImage.includes("fc.png")) {
			noteLamp = "FULL COMBO";
		}

		const hasPerformanceLamp =
			bellLamp === "FULL BELL" ||
			noteLamp === "FULL COMBO" ||
			noteLamp === "ALL BREAK" ||
			noteLamp === "ALL BREAK+";

		if (!hasPerformanceLamp) {
			noteLamp = LampCalculator.resolveNoteLampWithoutPerformanceLamp(
				lampImages,
				options,
			);
		}

		if (bellLamp === "FULL BELL" && noteLamp === "LOSS") {
			noteLamp = "CLEAR";
		}

		return { noteLamp, bellLamp };
	}

	private static resolveNoteLampWithoutPerformanceLamp(
		lampImages: Array<string>,
		options: LampCalculatorOptions,
	): OngekiNoteLamp {
		if (options.mode === "playlog") {
			const explicitLoss =
				lampImages.some((image) => image.includes("lose.png")) ||
				lampImages[0]?.includes("base.png") === true;

			if (explicitLoss || options.score < ONGEKI_TECHNICAL_RANK_S_THRESHOLD) {
				return "LOSS";
			}

			return "CLEAR";
		}

		if (LampCalculator.isPersonalBestClear(lampImages, options)) {
			return "CLEAR";
		}

		if (lampImages.some((image) => image.includes("lose.png"))) {
			return "LOSS";
		}

		if (options.score < ONGEKI_TECHNICAL_RANK_S_THRESHOLD) {
			return "LOSS";
		}

		return "CLEAR";
	}

	private static isPersonalBestClear(
		lampImages: Array<string>,
		options: LampCalculatorOptions,
	): boolean {
		const battleRankIcon = lampImages[0] ?? "";

		if (battleRankIcon.includes("music_icon_br_")) {
			return true;
		}

		const overDamagePercent = options.overDamagePercent;
		if (overDamagePercent !== undefined && overDamagePercent > 0) {
			return true;
		}

		if (
			overDamagePercent === 0 &&
			options.score >= ONGEKI_TECHNICAL_RANK_S_THRESHOLD
		) {
			return true;
		}

		return false;
	}
}
