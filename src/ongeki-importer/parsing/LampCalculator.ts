import { OngekiNoteLamp, OngekiBellLamp, LampResult } from "../models/types";

export class LampCalculator {
	static calculate(lampImages: Array<string>, isPB: boolean = false): LampResult {
		let noteLamp: OngekiNoteLamp = "CLEAR";
		let bellLamp: OngekiBellLamp = "NONE";

		if (lampImages.some((i) => i.includes("abplus.png"))) {
			noteLamp = "ALL BREAK+";
		} else if (lampImages.some((i) => i.includes("ab.png"))) {
			noteLamp = "ALL BREAK";
		} else if (lampImages.some((i) => i.includes("fc.png"))) {
			noteLamp = "FULL COMBO";
		}

		if (lampImages.some((i) => i.includes("fb.png"))) {
			bellLamp = "FULL BELL";
		}

		if (lampImages.some((i) => i.includes("lose.png"))) {
			noteLamp = "LOSS";
		}

		if (isPB && lampImages[0]?.includes("music_icon_back.png")) {
			noteLamp = "LOSS";
		}

		return { noteLamp, bellLamp };
	}
}
