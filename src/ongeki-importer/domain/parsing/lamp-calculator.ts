import { ONGEKI_TECHNICAL_RANK_S_THRESHOLD } from "../../config/constants";
import { OngekiNoteLamp, OngekiBellLamp, LampResult } from "../models/types";

export type LampCalculatorMode = "pb" | "playlog";

export interface LampCalculatorOptions {
	mode: LampCalculatorMode;
	score: number;
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
			const explicitLoss =
				lampImages.some((image) => image.includes("lose.png")) ||
				(options.mode === "pb" &&
					lampImages[0]?.includes("music_icon_back.png") === true) ||
				(options.mode === "playlog" &&
					lampImages[0]?.includes("base.png") === true);

			if (explicitLoss || options.score < ONGEKI_TECHNICAL_RANK_S_THRESHOLD) {
				noteLamp = "LOSS";
			}
		}

		if (bellLamp === "FULL BELL" && noteLamp === "LOSS") {
			noteLamp = "CLEAR";
		}

		return { noteLamp, bellLamp };
	}
}
