import { ParseError } from "../models/errors";

export class DupeSongConverter {
    static processSingularityToTachiID(doc: HTMLElement | Document): string {
		const imgSrc = doc.querySelector<HTMLImageElement>("img.m_5.f_l")?.src;
		switch (imgSrc) {
			case "https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png": // Koboshi
				return "362";
			case "https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png": // Arcaea
				return "425";
			case "https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png": // Mahjong
				return "487";
			default:
				throw new ParseError(
					"DupeSongConverter.processSingularityToTachiID",
					`Unknown Singularity image source: ${imgSrc}`,
				);
		}
	}

	static processPerfectShiningToInGameID(doc: HTMLElement | Document): string {
		if (doc.textContent?.includes("星咲 あかり Lv.1")) { // Lunatic 0
			return "8003";
		} else if (doc.textContent?.includes("星咲 あかり Lv.39")) { // Lunatic 13+
			return "8091";
		}
		throw new ParseError(
			"DupeSongConverter.processPerfectShiningToInGameID",
			"Unknown Perfect Shining!! variant, check Lunatic chart list.",
		);
	}
}